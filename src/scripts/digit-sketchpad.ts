/* Digit sketchpad: draw a digit, a 784-64-10 MLP guesses it, running
   entirely in the browser. Weights come quantized from
   /models/digits.json (see scripts/train-digits.mjs). */

type Model = {
  arch: number[];
  layers: { w: string; scale: number; b: number[] }[];
};

function decodeLayer(l: Model['layers'][number]) {
  const bin = atob(l.w);
  const w = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    const v = bin.charCodeAt(i);
    w[i] = (v > 127 ? v - 256 : v) * l.scale;
  }
  return { w, b: Float32Array.from(l.b) };
}

export default async function init(section: HTMLElement) {
  const canvas = section.querySelector<HTMLCanvasElement>('canvas.pad');
  const barsEl = section.querySelector<HTMLElement>('.bars');
  const guessEl = section.querySelector<HTMLElement>('.guess');
  const live = section.querySelector<HTMLElement>('.pad-status');
  if (!canvas || !barsEl || !guessEl || !live) return;
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let inkColor = '#e9e5da';
  function readPalette() {
    inkColor = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || inkColor;
  }

  let model: { w1: Float32Array; b1: Float32Array; w2: Float32Array; b2: Float32Array } | null = null;
  let arch = [784, 64, 10];
  fetch('/models/digits.json')
    .then((r) => r.json())
    .then((m: Model) => {
      arch = m.arch;
      const l1 = decodeLayer(m.layers[0]);
      const l2 = decodeLayer(m.layers[1]);
      model = { w1: l1.w, b1: l1.b, w2: l2.w, b2: l2.b };
      live.textContent = 'model loaded · draw a digit';
    })
    .catch(() => {
      live.textContent = 'model failed to load';
    });

  /* bars skeleton */
  const fills: HTMLElement[] = [];
  for (let d = 0; d <= 9; d++) {
    const col = document.createElement('div');
    col.className = 'col';
    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('div');
    fill.className = 'fill';
    track.appendChild(fill);
    const lab = document.createElement('span');
    lab.textContent = String(d);
    col.appendChild(track);
    col.appendChild(lab);
    barsEl.appendChild(col);
    fills.push(fill);
  }

  let side = 280;
  function resize() {
    side = Math.min(280, canvas.parentElement?.clientWidth || 280);
    canvas.style.width = side + 'px';
    canvas.style.height = side + 'px';
    canvas.width = side * dpr;
    canvas.height = side * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  type Stroke = number[]; /* x,y pairs in [0,1] */
  let strokes: Stroke[] = [];
  let current: Stroke | null = null;

  function strokePath(c: CanvasRenderingContext2D, s: Stroke, scale: number, lw: number) {
    c.lineWidth = lw;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < s.length; i += 2) {
      const x = s[i] * scale;
      const y = s[i + 1] * scale;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    if (s.length === 2) c.lineTo(s[0] * scale + 0.01, s[1] * scale);
    c.stroke();
  }

  function redraw() {
    ctx.clearRect(0, 0, side, side);
    ctx.strokeStyle = inkColor;
    for (const s of strokes) strokePath(ctx, s, side, side * 0.065);
    if (current) strokePath(ctx, current, side, side * 0.065);
  }

  /* ---- MNIST-style preprocessing + forward pass ---- */
  const raster = document.createElement('canvas');
  raster.width = raster.height = 280;
  const rx = raster.getContext('2d', { willReadFrequently: true })!;
  const small = document.createElement('canvas');
  small.width = small.height = 28;
  const sx = small.getContext('2d', { willReadFrequently: true })!;

  function classify() {
    if (!model) return;
    if (!strokes.length && !current) return;
    rx.fillStyle = '#000';
    rx.fillRect(0, 0, 280, 280);
    rx.strokeStyle = '#fff';
    for (const s of strokes) strokePath(rx, s, 280, 20);
    if (current) strokePath(rx, current, 280, 20);

    const img = rx.getImageData(0, 0, 280, 280).data;
    let x0 = 280, y0 = 280, x1 = -1, y1 = -1;
    for (let y = 0; y < 280; y += 2) {
      for (let x = 0; x < 280; x += 2) {
        if (img[(y * 280 + x) * 4] > 16) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return;
    const bw = x1 - x0 + 4;
    const bh = y1 - y0 + 4;
    const scale = 20 / Math.max(bw, bh);
    const dw = bw * scale;
    const dh = bh * scale;

    sx.fillStyle = '#000';
    sx.fillRect(0, 0, 28, 28);
    sx.imageSmoothingEnabled = true;
    sx.drawImage(raster, x0 - 2, y0 - 2, bw, bh, (28 - dw) / 2, (28 - dh) / 2, dw, dh);

    /* center of mass shift, like the MNIST pipeline */
    let m = 0, mx = 0, my = 0;
    let d0 = sx.getImageData(0, 0, 28, 28).data;
    for (let y = 0; y < 28; y++)
      for (let x = 0; x < 28; x++) {
        const v = d0[(y * 28 + x) * 4];
        m += v;
        mx += x * v;
        my += y * v;
      }
    const dxs = Math.round(13.5 - mx / m);
    const dys = Math.round(13.5 - my / m);
    if (dxs || dys) {
      const copy = document.createElement('canvas');
      copy.width = copy.height = 28;
      copy.getContext('2d')!.drawImage(small, 0, 0);
      sx.fillStyle = '#000';
      sx.fillRect(0, 0, 28, 28);
      sx.drawImage(copy, dxs, dys);
      d0 = sx.getImageData(0, 0, 28, 28).data;
    }

    const input = new Float32Array(784);
    for (let i = 0; i < 784; i++) input[i] = d0[i * 4] / 255;

    const [D, Hn, C] = arch;
    const h = new Float32Array(Hn);
    for (let j = 0; j < Hn; j++) {
      let acc = model.b1[j];
      const wo = j * D;
      for (let i = 0; i < D; i++) acc += model.w1[wo + i] * input[i];
      h[j] = acc > 0 ? acc : 0;
    }
    const logits = new Float32Array(C);
    let mxv = -Infinity;
    for (let k = 0; k < C; k++) {
      let acc = model.b2[k];
      const wo = k * Hn;
      for (let j = 0; j < Hn; j++) acc += model.w2[wo + j] * h[j];
      logits[k] = acc;
      if (acc > mxv) mxv = acc;
    }
    let sum = 0;
    const probs = new Float32Array(C);
    for (let k = 0; k < C; k++) {
      probs[k] = Math.exp(logits[k] - mxv);
      sum += probs[k];
    }
    let best = 0;
    for (let k = 0; k < C; k++) {
      probs[k] /= sum;
      if (probs[k] > probs[best]) best = k;
    }
    for (let k = 0; k < C; k++) {
      fills[k].style.height = `${Math.max(2, probs[k] * 100)}%`;
      fills[k].classList.toggle('top', k === best);
    }
    guessEl.textContent = String(best);
    live.textContent = `reading ${best} · ${(probs[best] * 100).toFixed(0)}% sure`;
  }

  let throttle = 0;
  canvas.addEventListener('pointerdown', (e) => {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    const r = canvas.getBoundingClientRect();
    current = [(e.clientX - r.left) / side, (e.clientY - r.top) / side];
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return;
    const r = canvas.getBoundingClientRect();
    current.push((e.clientX - r.left) / side, (e.clientY - r.top) / side);
    redraw();
    const now = performance.now();
    if (now - throttle > 140) {
      throttle = now;
      classify();
    }
  });
  const endStroke = () => {
    if (!current) return;
    strokes.push(current);
    current = null;
    classify();
  };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  section.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
    strokes = [];
    current = null;
    redraw();
    guessEl.textContent = '·';
    for (const f of fills) {
      f.style.height = '2%';
      f.classList.remove('top');
    }
    live.textContent = 'cleared · draw a digit';
  });

  window.addEventListener('themechange', () => {
    readPalette();
    redraw();
  });
  window.addEventListener('resize', resize);

  readPalette();
  resize();
}
