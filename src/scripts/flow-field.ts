/* Flow field: particles trace a hidden Perlin noise field, leaving fading
   trails. The cursor stirs the field; a click scatters a ring. Theme-aware,
   lazy-loaded; reduced motion renders one long exposure instead. */

export function makePerlin() {
  const p = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return x - y;
      case 2: return -x + y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

export default function init(section: HTMLElement) {
  const canvas = section.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const noise = makePerlin();

  let W = 0;
  let H = 0;
  let starRGB = '210, 222, 244';
  let brassHSL = '42 52% 56%';
  let bgRGB: [number, number, number] = [11, 15, 27];

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.trim().replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    starRGB = cs.getPropertyValue('--sky-star').trim() || starRGB;
    const hh = cs.getPropertyValue('--accent-h').trim() || '42';
    const s = cs.getPropertyValue('--brass-s').trim() || '52%';
    const l = cs.getPropertyValue('--brass-l').trim() || '56%';
    brassHSL = `${hh} ${s} ${l}`;
    try {
      bgRGB = hexToRgb(cs.getPropertyValue('--bg-deep'));
    } catch {}
  }

  let px: Float32Array;
  let py: Float32Array;
  let ox: Float32Array;
  let oy: Float32Array;
  let n = 0;
  let t = 0;
  const mouse = { x: -9999, y: -9999 };

  function respawn(i: number) {
    px[i] = ox[i] = Math.random() * W;
    py[i] = oy[i] = Math.random() * H;
  }
  function setup() {
    n = Math.min(1000, Math.floor((W * H) / 750));
    px = new Float32Array(n);
    py = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    for (let i = 0; i < n; i++) respawn(i);
    ctx.fillStyle = `rgb(${bgRGB.join(',')})`;
    ctx.fillRect(0, 0, W, H);
  }
  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setup();
  }

  function stepParticles(withMouse: boolean) {
    const s = 0.0032;
    for (let i = 0; i < n; i++) {
      const a = noise(px[i] * s + t * 0.5, py[i] * s - t * 0.35) * Math.PI * 3.2;
      let vx = Math.cos(a) * 1.5;
      let vy = Math.sin(a) * 1.5;
      if (withMouse) {
        const dx = px[i] - mouse.x;
        const dy = py[i] - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 8100 && d2 > 1) {
          const d = Math.sqrt(d2);
          const k = (1 - d / 90) * 1.6;
          vx += (-dy / d) * k + (dx / d) * k * 0.4;
          vy += (dx / d) * k + (dy / d) * k * 0.4;
        }
      }
      ox[i] = px[i];
      oy[i] = py[i];
      px[i] += vx;
      py[i] += vy;
      if (px[i] < -4 || px[i] > W + 4 || py[i] < -4 || py[i] > H + 4) respawn(i);
    }
  }

  function drawTrails() {
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      if (Math.abs(px[i] - ox[i]) > 6 || Math.abs(py[i] - oy[i]) > 6) continue;
      ctx.strokeStyle = i % 14 === 0 ? `hsl(${brassHSL} / 0.16)` : `rgba(${starRGB}, 0.09)`;
      ctx.beginPath();
      ctx.moveTo(ox[i], oy[i]);
      ctx.lineTo(px[i], py[i]);
      ctx.stroke();
    }
  }

  let running = false;
  let onscreen = true;
  function frame() {
    if (!running) return;
    t += 0.0035;
    ctx.fillStyle = `rgba(${bgRGB.join(',')}, 0.05)`;
    ctx.fillRect(0, 0, W, H);
    stepParticles(true);
    drawTrails();
    requestAnimationFrame(frame);
  }
  function ensure() {
    if (reduced) return;
    const want = onscreen && !document.hidden;
    if (want && !running) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!want) {
      running = false;
    }
  }

  function longExposure() {
    ctx.fillStyle = `rgb(${bgRGB.join(',')})`;
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 420; k++) {
      t += 0.0012;
      stepParticles(false);
      drawTrails();
    }
  }

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    for (let i = 0; i < n; i++) {
      if (i % 3) continue;
      const a = Math.random() * Math.PI * 2;
      const rad = 20 + Math.random() * 60;
      px[i] = ox[i] = cx + Math.cos(a) * rad;
      py[i] = oy[i] = cy + Math.sin(a) * rad;
    }
  });

  new IntersectionObserver((ents) => {
    onscreen = ents[0]?.isIntersecting ?? true;
    ensure();
  }).observe(canvas);
  document.addEventListener('visibilitychange', ensure);
  window.addEventListener('themechange', () => {
    readPalette();
    if (reduced) longExposure();
    else {
      ctx.fillStyle = `rgb(${bgRGB.join(',')})`;
      ctx.fillRect(0, 0, W, H);
    }
  });
  window.addEventListener('resize', () => {
    resize();
    if (reduced) longExposure();
  });

  readPalette();
  resize();
  if (reduced) longExposure();
  else ensure();
}
