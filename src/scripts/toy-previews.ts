/* Micro-previews for the home playground teaser: each toy card gets a tiny
   self-driving canvas running a parameterized mode of its playground widget.
   Lazy-loaded, paused offscreen, one static frame under reduced motion. */

import { makePerlin } from './flow-field';

type Preview = {
  canvas: HTMLCanvasElement;
  visible: boolean;
  resize: () => void;
  step: (dt: number) => void; /* one animated frame; dt in ms */
  statik: () => void; /* the reduced-motion / theme-refresh frame */
};

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

let starRGB = '210, 222, 244';
let brassHSL = '42 52% 56%';
let faintColor = '#5f6880';
let bgRGB: [number, number, number] = [11, 15, 27];
let panelRGB: [number, number, number] = [17, 23, 41];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  starRGB = cs.getPropertyValue('--sky-star').trim() || starRGB;
  faintColor = cs.getPropertyValue('--faint').trim() || faintColor;
  const h = cs.getPropertyValue('--accent-h').trim() || '42';
  const s = cs.getPropertyValue('--brass-s').trim() || '52%';
  const l = cs.getPropertyValue('--brass-l').trim() || '56%';
  brassHSL = `${h} ${s} ${l}`;
  try {
    bgRGB = hexToRgb(cs.getPropertyValue('--bg-deep'));
    panelRGB = hexToRgb(cs.getPropertyValue('--panel'));
  } catch {}
}
const brass = (a: number) => `hsl(${brassHSL} / ${a})`;

function sizeToHost(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [W, H] as const;
}

/* ---------- flow field: the real thing, only smaller and slower ---------- */
function flowPreview(canvas: HTMLCanvasElement): Preview {
  const ctx = canvas.getContext('2d')!;
  const noise = makePerlin();
  let W = 0;
  let H = 0;
  let n = 0;
  let t = Math.random() * 10;
  let px: Float32Array, py: Float32Array, ox: Float32Array, oy: Float32Array;

  function respawn(i: number) {
    px[i] = ox[i] = Math.random() * W;
    py[i] = oy[i] = Math.random() * H;
  }
  function paintBg() {
    ctx.fillStyle = `rgb(${bgRGB.join(',')})`;
    ctx.fillRect(0, 0, W, H);
  }
  function advance() {
    const s = 0.0045;
    for (let i = 0; i < n; i++) {
      const a = noise(px[i] * s + t * 0.5, py[i] * s - t * 0.35) * Math.PI * 3.2;
      ox[i] = px[i];
      oy[i] = py[i];
      px[i] += Math.cos(a) * 1.1;
      py[i] += Math.sin(a) * 1.1;
      if (px[i] < -4 || px[i] > W + 4 || py[i] < -4 || py[i] > H + 4) respawn(i);
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      if (Math.abs(px[i] - ox[i]) > 6 || Math.abs(py[i] - oy[i]) > 6) continue;
      ctx.strokeStyle = i % 12 === 0 ? `hsl(${brassHSL} / 0.16)` : `rgba(${starRGB}, 0.08)`;
      ctx.beginPath();
      ctx.moveTo(ox[i], oy[i]);
      ctx.lineTo(px[i], py[i]);
      ctx.stroke();
    }
  }
  return {
    canvas,
    visible: false,
    resize() {
      [W, H] = sizeToHost(canvas, ctx);
      n = Math.max(30, Math.min(90, Math.floor((W * H) / 480)));
      px = new Float32Array(n);
      py = new Float32Array(n);
      ox = new Float32Array(n);
      oy = new Float32Array(n);
      for (let i = 0; i < n; i++) respawn(i);
      paintBg();
    },
    step() {
      t += 0.0035;
      ctx.fillStyle = `rgba(${bgRGB.join(',')}, 0.07)`;
      ctx.fillRect(0, 0, W, H);
      advance();
    },
    statik() {
      paintBg();
      for (let k = 0; k < 260; k++) {
        t += 0.0012;
        advance();
      }
    },
  };
}

/* ------- optimizer: Adam descends the Himmelblau contours on a loop ------- */
function optimizerPreview(canvas: HTMLCanvasElement): Preview {
  const ctx = canvas.getContext('2d')!;
  const bg = document.createElement('canvas');
  const bgx = bg.getContext('2d')!;
  let W = 0;
  let H = 0;
  /* non-uniform ranges so all four minima fit the short, wide card */
  const XR = 5.1;
  const YR = 3.9;
  const MINIMA = [
    [3, 2],
    [-2.805118, 3.131312],
    [-3.77931, -3.283186],
    [3.584428, -1.848126],
  ];
  const f = (x: number, y: number) => {
    const a = x * x + y - 11;
    const b = x + y * y - 7;
    return a * a + b * b;
  };
  const grad = (x: number, y: number): [number, number] => {
    const a = x * x + y - 11;
    const b = x + y * y - 7;
    return [4 * x * a + 2 * b, 2 * a + 4 * y * b];
  };
  const toPx = (x: number, y: number) => [((x + XR) / (2 * XR)) * W, ((YR - y) / (2 * YR)) * H];

  function renderBg() {
    bg.width = W;
    bg.height = H;
    if (!W || !H) return;
    const fmax = f(XR, YR);
    const img = bgx.createImageData(W, H);
    const d = img.data;
    for (let yy = 0; yy < H; yy++) {
      for (let xx = 0; xx < W; xx++) {
        const x = (xx / W) * 2 * XR - XR;
        const y = YR - (yy / H) * 2 * YR;
        const t = Math.log1p(f(x, y)) / Math.log1p(fmax);
        const band = Math.floor(t * 13);
        const edge = Math.abs(t * 13 - Math.round(t * 13)) < 0.045;
        const k = Math.min(1, t) * (band % 2 ? 0.92 : 1);
        const i = (yy * W + xx) * 4;
        for (let c = 0; c < 3; c++) {
          let v = bgRGB[c] + (panelRGB[c] - bgRGB[c]) * k;
          if (edge) v += 12;
          d[i + c] = v;
        }
        d[i + 3] = 255;
      }
    }
    bgx.putImageData(img, 0, 0);
    for (const [mx, my] of MINIMA) {
      const [px, py] = toPx(mx, my);
      bgx.fillStyle = brass(0.18);
      bgx.beginPath();
      bgx.arc(px, py, 5, 0, Math.PI * 2);
      bgx.fill();
      bgx.fillStyle = brass(0.85);
      bgx.beginPath();
      bgx.arc(px, py, 1.5, 0, Math.PI * 2);
      bgx.fill();
    }
  }

  let x = 0, y = 0, mx = 0, my = 0, sx = 0, sy = 0, at = 0, steps = 0;
  let done = false;
  let hold = 0;
  function restart() {
    x = (Math.random() * 2 - 1) * XR * 0.85;
    y = (Math.random() * 2 - 1) * YR * 0.85;
    mx = my = sx = sy = at = steps = 0;
    done = false;
    trail = [x, y];
  }
  let trail: number[] = [];
  function adamStep() {
    if (done) return;
    const [gx, gy] = grad(x, y);
    at++;
    mx = 0.9 * mx + 0.1 * gx;
    my = 0.9 * my + 0.1 * gy;
    sx = 0.999 * sx + 0.001 * gx * gx;
    sy = 0.999 * sy + 0.001 * gy * gy;
    const mhx = mx / (1 - Math.pow(0.9, at));
    const mhy = my / (1 - Math.pow(0.9, at));
    const shx = sx / (1 - Math.pow(0.999, at));
    const shy = sy / (1 - Math.pow(0.999, at));
    x -= (0.09 * mhx) / (Math.sqrt(shx) + 1e-8);
    y -= (0.09 * mhy) / (Math.sqrt(shy) + 1e-8);
    x = Math.max(-XR, Math.min(XR, x));
    y = Math.max(-YR, Math.min(YR, y));
    trail.push(x, y);
    steps++;
    const [ngx, ngy] = grad(x, y);
    if (Math.hypot(ngx, ngy) < 0.05 || steps >= 600) done = true;
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);
    if (trail.length < 4) return;
    ctx.lineJoin = 'round';
    for (const [w, a] of [
      [3.5, 0.12],
      [1.1, 0.85],
    ] as const) {
      ctx.strokeStyle = brass(a);
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i += 2) {
        const [px, py] = toPx(trail[i], trail[i + 1]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    const [hx, hy] = toPx(x, y);
    ctx.fillStyle = brass(0.2);
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = brass(0.95);
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    canvas,
    visible: false,
    resize() {
      [W, H] = sizeToHost(canvas, ctx);
      renderBg();
      restart();
      draw();
    },
    step(dt) {
      if (done) {
        hold += dt;
        if (hold > 1300) {
          hold = 0;
          restart();
        }
        return;
      }
      adamStep();
      adamStep();
      adamStep();
      draw();
    },
    statik() {
      renderBg();
      restart();
      while (!done) adamStep();
      draw();
    },
  };
}

/* ------ perfect circle: a wobbly stroke draws itself, gets its score ------ */
function circlePreview(canvas: HTMLCanvasElement): Preview {
  const ctx = canvas.getContext('2d')!;
  let W = 0;
  let H = 0;
  let R = 30, eps = 0.05, k = 3, ph = 0, progress = 0, hold = 0;
  let score = 0;
  const SAMPLES = 110;

  function restart() {
    R = Math.min(W, H) * 0.36;
    eps = 0.02 + Math.random() * 0.065;
    k = 2 + Math.floor(Math.random() * 4);
    ph = Math.random() * Math.PI * 2;
    progress = 0;
    hold = 0;
    /* same score the widget would give: rms radial deviation over radius */
    score = Math.min(99.9, Math.max(0, (1 - (eps / Math.SQRT2) * 4) * 100));
  }
  const radiusAt = (a: number) => R * (1 + eps * Math.sin(k * a + ph));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const end = Math.min(1, progress) * Math.PI * 2 * 0.98;
    for (const [lw, col] of [
      [6, brass(0.07)],
      [1.8, `rgba(${starRGB}, 0.9)`],
    ] as const) {
      ctx.strokeStyle = col as string;
      ctx.lineWidth = lw as number;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= SAMPLES; i++) {
        const a = (i / SAMPLES) * end - Math.PI / 2;
        const r = radiusAt(a);
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    if (progress >= 1) {
      ctx.setLineDash([1, 6]);
      ctx.strokeStyle = brass(0.75);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.shadowColor = brass(0.6);
      ctx.shadowBlur = 14;
      ctx.fillStyle = brass(0.96);
      ctx.font = '500 19px "Newsreader Variable", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${score.toFixed(1)}%`, cx, cy + 1);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }
  return {
    canvas,
    visible: false,
    resize() {
      [W, H] = sizeToHost(canvas, ctx);
      restart();
      draw();
    },
    step(dt) {
      if (progress < 1) {
        progress += dt / 1400;
        draw();
        return;
      }
      hold += dt;
      if (hold > 2100) restart();
    },
    statik() {
      progress = 1;
      draw();
    },
  };
}

/* -------- digit sketchpad: the guess and its probability bars loop -------- */
function digitsPreview(canvas: HTMLCanvasElement): Preview {
  const ctx = canvas.getContext('2d')!;
  let W = 0;
  let H = 0;
  let digit = 7;
  const target = new Float32Array(10);
  const heights = new Float32Array(10);
  let wait = 0;

  function nextDigit() {
    let d = Math.floor(Math.random() * 10);
    if (d === digit) d = (d + 3) % 10;
    digit = d;
    const conf = 0.6 + Math.random() * 0.33;
    let rest = 1 - conf;
    const noise = Array.from({ length: 10 }, () => Math.random());
    const sum = noise.reduce((a, b) => a + b, 0) - noise[digit];
    for (let i = 0; i < 10; i++) target[i] = i === digit ? conf : (noise[i] / sum) * rest;
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    /* the guess, big and brass, like the widget's readout */
    ctx.save();
    ctx.shadowColor = brass(0.5);
    ctx.shadowBlur = 16;
    ctx.fillStyle = brass(0.95);
    ctx.font = `500 ${Math.round(H * 0.62)}px "Newsreader Variable", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(digit), W * 0.18, H * 0.52);
    ctx.restore();
    /* ten probability bars */
    const bx = W * 0.34;
    const bw = (W * 0.6) / 10;
    const baseY = H * 0.78;
    const maxH = H * 0.56;
    for (let i = 0; i < 10; i++) {
      const hgt = Math.max(2, heights[i] * maxH);
      const x = bx + i * bw;
      if (i === digit) {
        /* a soft halo behind the winning bar */
        ctx.fillStyle = brass(0.18);
        ctx.fillRect(x - 1.5, baseY - hgt - 1.5, bw, hgt + 3);
      }
      ctx.fillStyle = i === digit ? brass(0.9) : `rgba(${starRGB}, 0.22)`;
      ctx.fillRect(x, baseY - hgt, bw - 3, hgt);
      ctx.fillStyle = faintColor;
      ctx.font = '8.5px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(i), x + (bw - 3) / 2, baseY + 11);
      ctx.textAlign = 'left';
    }
  }
  nextDigit();
  return {
    canvas,
    visible: false,
    resize() {
      [W, H] = sizeToHost(canvas, ctx);
      draw();
    },
    step(dt) {
      wait += dt;
      if (wait > 2400) {
        wait = 0;
        nextDigit();
      }
      for (let i = 0; i < 10; i++) heights[i] += (target[i] - heights[i]) * 0.1;
      draw();
    },
    statik() {
      heights.set(target);
      draw();
    },
  };
}

const FACTORIES: Record<string, (c: HTMLCanvasElement) => Preview> = {
  flow: flowPreview,
  optimizer: optimizerPreview,
  circle: circlePreview,
  digits: digitsPreview,
};

export default function init(container: HTMLElement) {
  readPalette();
  const previews: Preview[] = [];
  for (const canvas of container.querySelectorAll<HTMLCanvasElement>('canvas[data-preview]')) {
    const make = FACTORIES[canvas.dataset.preview!];
    if (make) previews.push(make(canvas));
  }
  if (!previews.length) return;

  for (const p of previews) p.resize();
  if (reduced) {
    for (const p of previews) p.statik();
  }

  let running = false;
  let last = 0;
  function loop(t: number) {
    if (document.hidden || !previews.some((p) => p.visible)) {
      running = false;
      return;
    }
    const dt = Math.min(50, t - last);
    last = t;
    for (const p of previews) if (p.visible) p.step(dt);
    requestAnimationFrame(loop);
  }
  function ensure() {
    if (reduced) return;
    if (!running && !document.hidden && previews.some((p) => p.visible)) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  const io = new IntersectionObserver((ents) => {
    for (const en of ents) {
      const p = previews.find((q) => q.canvas === en.target);
      if (p) p.visible = en.isIntersecting;
    }
    ensure();
  });
  for (const p of previews) io.observe(p.canvas);
  document.addEventListener('visibilitychange', ensure);
  window.addEventListener('resize', () => {
    for (const p of previews) p.resize();
    if (reduced) for (const p of previews) p.statik();
  });
  window.addEventListener('themechange', () => {
    readPalette();
    for (const p of previews) p.resize();
    if (reduced) for (const p of previews) p.statik();
  });
}
