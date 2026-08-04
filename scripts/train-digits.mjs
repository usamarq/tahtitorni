/* Trains the digit sketchpad model: a 784-64-10 MLP on MNIST, pure Node,
   no dependencies. Exports int8-quantized weights to public/models/digits.json
   for the pure-TS inference on /playground.
   Run from the repo root: node scripts/train-digits.mjs
   MNIST downloads are cached in the OS temp dir. */
import { gunzipSync } from 'node:zlib';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MIRROR = 'https://storage.googleapis.com/cvdf-datasets/mnist/';
const FILES = {
  trainImages: 'train-images-idx3-ubyte.gz',
  trainLabels: 'train-labels-idx1-ubyte.gz',
  testImages: 't10k-images-idx3-ubyte.gz',
  testLabels: 't10k-labels-idx1-ubyte.gz',
};
const CACHE = join(tmpdir(), 'mnist-cache');
mkdirSync(CACHE, { recursive: true });

async function fetchCached(name) {
  const path = join(CACHE, name);
  if (!existsSync(path)) {
    process.stdout.write(`downloading ${name}... `);
    const res = await fetch(MIRROR + name);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log('done');
  }
  return gunzipSync(readFileSync(path));
}

function parseImages(buf) {
  const n = buf.readUInt32BE(4);
  const rows = buf.readUInt32BE(8);
  const cols = buf.readUInt32BE(12);
  const out = new Float32Array(n * rows * cols);
  for (let i = 0; i < n * rows * cols; i++) out[i] = buf[16 + i] / 255;
  return { n, dim: rows * cols, data: out };
}
function parseLabels(buf) {
  const n = buf.readUInt32BE(4);
  return new Uint8Array(buf.subarray(8, 8 + n));
}

const [trI, trL, teI, teL] = await Promise.all([
  fetchCached(FILES.trainImages),
  fetchCached(FILES.trainLabels),
  fetchCached(FILES.testImages),
  fetchCached(FILES.testLabels),
]);
const train = parseImages(trI);
const trainY = parseLabels(trL);
const test = parseImages(teI);
const testY = parseLabels(teL);
console.log(`train ${train.n} · test ${test.n} · dim ${train.dim}`);

/* ---- model: 784 -> H (relu) -> 10 (softmax) ---- */
const D = train.dim;
const H = 64;
const C = 10;

function heInit(fanIn, size) {
  const a = new Float32Array(size);
  const s = Math.sqrt(2 / fanIn);
  for (let i = 0; i < size; i++) {
    /* Box-Muller */
    const u = Math.random() || 1e-9;
    const v = Math.random();
    a[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * s;
  }
  return a;
}
const W1 = heInit(D, H * D);
const b1 = new Float32Array(H);
const W2 = heInit(H, C * H);
const b2 = new Float32Array(C);
const vW1 = new Float32Array(H * D);
const vb1 = new Float32Array(H);
const vW2 = new Float32Array(C * H);
const vb2 = new Float32Array(C);

const BATCH = 128;
const EPOCHS = 5;
const MOM = 0.9;

const h = new Float32Array(BATCH * H);
const logits = new Float32Array(BATCH * C);
const probs = new Float32Array(BATCH * C);
const dh = new Float32Array(BATCH * H);

function forwardBatch(X, idxs, m) {
  for (let s = 0; s < m; s++) {
    const xo = idxs[s] * D;
    for (let j = 0; j < H; j++) {
      let acc = b1[j];
      const wo = j * D;
      for (let i = 0; i < D; i++) acc += W1[wo + i] * X[xo + i];
      h[s * H + j] = acc > 0 ? acc : 0;
    }
    for (let k = 0; k < C; k++) {
      let acc = b2[k];
      const wo = k * H;
      for (let j = 0; j < H; j++) acc += W2[wo + j] * h[s * H + j];
      logits[s * C + k] = acc;
    }
    let mx = -Infinity;
    for (let k = 0; k < C; k++) mx = Math.max(mx, logits[s * C + k]);
    let sum = 0;
    for (let k = 0; k < C; k++) {
      const e = Math.exp(logits[s * C + k] - mx);
      probs[s * C + k] = e;
      sum += e;
    }
    for (let k = 0; k < C; k++) probs[s * C + k] /= sum;
  }
}

function trainEpoch(lr) {
  const order = new Uint32Array(train.n);
  for (let i = 0; i < train.n; i++) order[i] = i;
  for (let i = train.n - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  let loss = 0;
  for (let off = 0; off + BATCH <= train.n; off += BATCH) {
    const idxs = order.subarray(off, off + BATCH);
    forwardBatch(train.data, idxs, BATCH);

    /* grads: dlogits = probs - onehot */
    for (let s = 0; s < BATCH; s++) {
      loss -= Math.log(probs[s * C + trainY[idxs[s]]] + 1e-9);
      probs[s * C + trainY[idxs[s]]] -= 1;
    }
    /* dh = W2^T dlogits ; dW2 += dlogits h^T */
    dh.fill(0);
    const scale = lr / BATCH;
    for (let k = 0; k < C; k++) {
      const wo = k * H;
      let gb = 0;
      for (let s = 0; s < BATCH; s++) {
        const g = probs[s * C + k];
        gb += g;
        for (let j = 0; j < H; j++) dh[s * H + j] += W2[wo + j] * g;
      }
      vb2[k] = MOM * vb2[k] - scale * gb;
      b2[k] += vb2[k];
      for (let j = 0; j < H; j++) {
        let gw = 0;
        for (let s = 0; s < BATCH; s++) gw += probs[s * C + k] * h[s * H + j];
        vW2[wo + j] = MOM * vW2[wo + j] - scale * gw;
        W2[wo + j] += vW2[wo + j];
      }
    }
    /* relu backward + dW1 */
    for (let s = 0; s < BATCH; s++)
      for (let j = 0; j < H; j++) if (h[s * H + j] <= 0) dh[s * H + j] = 0;
    for (let j = 0; j < H; j++) {
      const wo = j * D;
      let gb = 0;
      for (let s = 0; s < BATCH; s++) gb += dh[s * H + j];
      vb1[j] = MOM * vb1[j] - scale * gb;
      b1[j] += vb1[j];
      for (let i = 0; i < D; i++) {
        let gw = 0;
        for (let s = 0; s < BATCH; s++) gw += dh[s * H + j] * train.data[idxs[s] * D + i];
        vW1[wo + i] = MOM * vW1[wo + i] - scale * gw;
        W1[wo + i] += vW1[wo + i];
      }
    }
  }
  return loss / train.n;
}

function accuracy(X, Y, n) {
  let ok = 0;
  const idxs = new Uint32Array(BATCH);
  for (let off = 0; off < n; off += BATCH) {
    const m = Math.min(BATCH, n - off);
    for (let s = 0; s < m; s++) idxs[s] = off + s;
    forwardBatch(X, idxs, m);
    for (let s = 0; s < m; s++) {
      let best = 0;
      for (let k = 1; k < C; k++)
        if (probs[s * C + k] > probs[s * C + best]) best = k;
      if (best === Y[off + s]) ok++;
    }
  }
  return ok / n;
}

let lr = 0.08;
for (let e = 1; e <= EPOCHS; e++) {
  const t0 = Date.now();
  const loss = trainEpoch(lr);
  const acc = accuracy(test.data, testY, test.n);
  console.log(
    `epoch ${e}/${EPOCHS} · lr ${lr.toFixed(3)} · loss ${loss.toFixed(4)} · test ${(acc * 100).toFixed(2)}% · ${((Date.now() - t0) / 1000).toFixed(0)}s`
  );
  if (e >= 2) lr *= 0.5;
}

/* ---- quantize int8 per layer and export ---- */
function quantize(arr) {
  let mx = 0;
  for (const v of arr) mx = Math.max(mx, Math.abs(v));
  const scale = mx / 127;
  const q = new Int8Array(arr.length);
  for (let i = 0; i < arr.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(arr[i] / scale)));
  return { b64: Buffer.from(q.buffer).toString('base64'), scale };
}
const q1 = quantize(W1);
const q2 = quantize(W2);
const model = {
  arch: [D, H, C],
  layers: [
    { w: q1.b64, scale: q1.scale, b: Array.from(b1, (v) => +v.toFixed(5)) },
    { w: q2.b64, scale: q2.scale, b: Array.from(b2, (v) => +v.toFixed(5)) },
  ],
};
mkdirSync('public/models', { recursive: true });
writeFileSync('public/models/digits.json', JSON.stringify(model));
const finalAcc = accuracy(test.data, testY, test.n);
console.log(`wrote public/models/digits.json · final test ${(finalAcc * 100).toFixed(2)}%`);
