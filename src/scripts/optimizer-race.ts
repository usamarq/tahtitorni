/* Optimizer race: SGD, momentum and Adam descend the Himmelblau surface
   from wherever you click. Vanilla TS + canvas, theme-aware, lazy-loaded. */

type Racer = {
  name: string;
  color: (a: number) => string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  sx: number;
  sy: number;
  t: number;
  trail: number[];
  steps: number;
  done: boolean;
};

const MINIMA = [
  [3, 2],
  [-2.805118, 3.131312],
  [-3.77931, -3.283186],
  [3.584428, -1.848126],
];

function f(x: number, y: number) {
  const a = x * x + y - 11;
  const b = x + y * y - 7;
  return a * a + b * b;
}
function grad(x: number, y: number): [number, number] {
  const a = x * x + y - 11;
  const b = x + y * y - 7;
  return [4 * x * a + 2 * b, 2 * a + 4 * y * b];
}

export default function init(section: HTMLElement) {
  const canvas = section.querySelector('canvas');
  const status = section.querySelector<HTMLElement>('.status');
  const legend = section.querySelector<HTMLElement>('.legend');
  if (!canvas || !status || !legend) return;
  const ctx = canvas.getContext('2d')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;
  /* y range is fixed so all four minima stay in frame; x follows the aspect */
  let YR = 3.7;
  let XR = 5.5;
  let starRGB = '210, 222, 244';
  let lineRGB = '143, 168, 216';
  let brassHSL = '42 52% 56%';
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
    lineRGB = cs.getPropertyValue('--sky-line').trim() || lineRGB;
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

  const bg = document.createElement('canvas');
  const bgx = bg.getContext('2d')!;

  const toPx = (x: number, y: number) => [((x + XR) / (2 * XR)) * W, ((YR - y) / (2 * YR)) * H];
  const toXY = (px: number, py: number) => [(px / W) * 2 * XR - XR, YR - (py / H) * 2 * YR];

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    YR = 3.7;
    XR = Math.max(4.2, YR * (W / H));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg.width = W;
    bg.height = H;
  }

  function renderBg() {
    const fmax = Math.max(f(XR, YR), f(-XR, YR), f(XR, -YR), f(-XR, -YR));
    const img = bgx.createImageData(W, H);
    const d = img.data;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const [x, y] = toXY(px + 0.5, py + 0.5);
        const t = Math.log1p(f(x, y)) / Math.log1p(fmax);
        const band = Math.floor(t * 16);
        const edge = Math.abs(t * 16 - Math.round(t * 16)) < 0.035;
        const k = Math.min(1, t) * (band % 2 ? 0.92 : 1);
        const i = (py * W + px) * 4;
        for (let c = 0; c < 3; c++) {
          let v = bgRGB[c] + (panelRGB[c] - bgRGB[c]) * k;
          if (edge) v += 14;
          d[i + c] = v;
        }
        d[i + 3] = 255;
      }
    }
    bgx.putImageData(img, 0, 0);
    for (const [mx, my] of MINIMA) {
      const [px, py] = toPx(mx, my);
      bgx.fillStyle = brass(0.16);
      bgx.beginPath();
      bgx.arc(px, py, 8, 0, Math.PI * 2);
      bgx.fill();
      bgx.fillStyle = brass(0.85);
      bgx.beginPath();
      bgx.arc(px, py, 2, 0, Math.PI * 2);
      bgx.fill();
    }
  }

  let racers: Racer[] | null = null;
  let lastStart: [number, number] | null = null;
  let running = false;

  function makeRacers(x0: number, y0: number): Racer[] {
    const base = { x: x0, y: y0, vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0, t: 0, trail: [x0, y0], steps: 0, done: false };
    return [
      { ...base, trail: [x0, y0], name: 'sgd', color: (a) => `rgba(${starRGB}, ${a})` },
      { ...base, trail: [x0, y0], name: 'momentum', color: (a) => `rgba(${lineRGB}, ${a})` },
      { ...base, trail: [x0, y0], name: 'adam', color: brass },
    ];
  }

  function stepRacer(r: Racer) {
    if (r.done) return;
    const [gx, gy] = grad(r.x, r.y);
    if (r.name === 'sgd') {
      r.x -= 0.01 * gx;
      r.y -= 0.01 * gy;
    } else if (r.name === 'momentum') {
      r.vx = 0.9 * r.vx - 0.0032 * gx;
      r.vy = 0.9 * r.vy - 0.0032 * gy;
      r.x += r.vx;
      r.y += r.vy;
    } else {
      r.t++;
      r.mx = 0.9 * r.mx + 0.1 * gx;
      r.my = 0.9 * r.my + 0.1 * gy;
      r.sx = 0.999 * r.sx + 0.001 * gx * gx;
      r.sy = 0.999 * r.sy + 0.001 * gy * gy;
      const mhx = r.mx / (1 - Math.pow(0.9, r.t));
      const mhy = r.my / (1 - Math.pow(0.9, r.t));
      const shx = r.sx / (1 - Math.pow(0.999, r.t));
      const shy = r.sy / (1 - Math.pow(0.999, r.t));
      r.x -= (0.09 * mhx) / (Math.sqrt(shx) + 1e-8);
      r.y -= (0.09 * mhy) / (Math.sqrt(shy) + 1e-8);
    }
    r.x = Math.max(-XR, Math.min(XR, r.x));
    r.y = Math.max(-YR, Math.min(YR, r.y));
    r.trail.push(r.x, r.y);
    r.steps++;
    const [ngx, ngy] = grad(r.x, r.y);
    if (Math.hypot(ngx, ngy) < 0.05 || r.steps >= 900) r.done = true;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);
    if (!racers) return;
    for (const r of racers) {
      ctx.lineJoin = 'round';
      for (const [w, a] of [
        [4.5, 0.1],
        [1.3, 0.85],
      ] as const) {
        ctx.strokeStyle = r.color(a);
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let i = 0; i < r.trail.length; i += 2) {
          const [px, py] = toPx(r.trail[i], r.trail[i + 1]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      const [hx, hy] = toPx(r.x, r.y);
      ctx.fillStyle = r.color(0.18);
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = r.color(0.95);
      ctx.beginPath();
      ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function statusText() {
    if (!racers) return 'click the surface to drop three optimizers';
    const parts = racers.map((r) => `${r.name} ${r.steps}${r.done ? ' ✓' : ''}`);
    if (racers.every((r) => r.done)) {
      const settled = racers.filter((r) => f(r.x, r.y) < 0.05);
      const winner = settled.sort((a, b) => a.steps - b.steps)[0];
      return winner
        ? `first to settle: ${winner.name}, ${winner.steps} steps · ${parts.join(' · ')}`
        : `nobody settled this time · ${parts.join(' · ')}`;
    }
    return parts.join(' · ');
  }

  function frame() {
    if (!racers) return;
    for (const r of racers) {
      stepRacer(r);
      stepRacer(r);
    }
    draw();
    status.textContent = statusText();
    if (racers.some((r) => !r.done)) requestAnimationFrame(frame);
    else running = false;
  }

  function start(x0: number, y0: number) {
    lastStart = [x0, y0];
    racers = makeRacers(x0, y0);
    if (reduced) {
      while (racers.some((r) => !r.done)) for (const r of racers) stepRacer(r);
      draw();
      status.textContent = statusText();
      return;
    }
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const [x, y] = toXY(e.clientX - rect.left, e.clientY - rect.top);
    start(x, y);
  });
  section.querySelector('[data-action="random"]')?.addEventListener('click', () => {
    const xr = Math.min(XR, 4.6);
    start((Math.random() * 2 - 1) * xr * 0.9, (Math.random() * 2 - 1) * YR * 0.9);
  });
  section.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
    racers = null;
    lastStart = null;
    draw();
    status.textContent = statusText();
  });
  window.addEventListener('themechange', () => {
    readPalette();
    renderBg();
    legendHtml();
    draw();
  });
  window.addEventListener('resize', () => {
    resize();
    renderBg();
    if (lastStart) start(lastStart[0], lastStart[1]);
    else draw();
  });

  function legendHtml() {
    legend.innerHTML = [
      ['sgd', `rgba(${starRGB}, 0.9)`],
      ['momentum', `rgba(${lineRGB}, 0.9)`],
      ['adam', brass(0.9)],
    ]
      .map(([n, c]) => `<span class="swatch"><i style="background:${c}"></i>${n}</span>`)
      .join('');
  }

  readPalette();
  resize();
  renderBg();
  legendHtml();
  draw();
  status.textContent = statusText();
}
