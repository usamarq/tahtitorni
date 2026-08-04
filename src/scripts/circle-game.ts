/* Perfect circle: draw a circle in one stroke; a least-squares (Kasa) fit
   scores how round it really was. Vanilla TS + canvas, theme-aware. */

export default function init(section: HTMLElement) {
  const canvas = section.querySelector('canvas');
  const status = section.querySelector<HTMLElement>('.status');
  const bestEl = section.querySelector<HTMLElement>('.best');
  if (!canvas || !status || !bestEl) return;
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0;
  let H = 0;
  let inkColor = '#e9e5da';
  let faintColor = '#5f6880';
  let brassHSL = '42 52% 56%';
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    inkColor = cs.getPropertyValue('--ink').trim() || inkColor;
    faintColor = cs.getPropertyValue('--faint').trim() || faintColor;
    const h = cs.getPropertyValue('--accent-h').trim() || '42';
    const s = cs.getPropertyValue('--brass-s').trim() || '52%';
    const l = cs.getPropertyValue('--brass-l').trim() || '56%';
    brassHSL = `${h} ${s} ${l}`;
  }
  const brass = (a: number) => `hsl(${brassHSL} / ${a})`;

  let pts: number[] = [];
  let drawing = false;
  let result: { cx: number; cy: number; r: number; score: number; verdict: string } | null = null;
  let best = 0;
  try {
    best = parseFloat(localStorage.getItem('circle-best') || '0') || 0;
  } catch {}

  function showBest() {
    bestEl.textContent = best > 0 ? `best ${best.toFixed(1)}%` : '';
  }

  /* Kasa circle fit: x² + y² + Dx + Ey + F = 0, solved by normal equations */
  function fitCircle(p: number[]) {
    const n = p.length / 2;
    let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
    for (let i = 0; i < p.length; i += 2) {
      const x = p[i];
      const y = p[i + 1];
      const z = -(x * x + y * y);
      sxx += x * x; sxy += x * y; syy += y * y;
      sx += x; sy += y;
      sxz += x * z; syz += y * z; sz += z;
    }
    const A = [
      [sxx, sxy, sx, sxz],
      [sxy, syy, sy, syz],
      [sx, sy, n, sz],
    ];
    for (let c = 0; c < 3; c++) {
      let piv = c;
      for (let r2 = c + 1; r2 < 3; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[piv][c])) piv = r2;
      if (Math.abs(A[piv][c]) < 1e-9) return null;
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let r2 = 0; r2 < 3; r2++) {
        if (r2 === c) continue;
        const k = A[r2][c] / A[c][c];
        for (let cc = c; cc < 4; cc++) A[r2][cc] -= k * A[c][cc];
      }
    }
    const D = A[0][3] / A[0][0];
    const E = A[1][3] / A[1][1];
    const F = A[2][3] / A[2][2];
    const cx = -D / 2;
    const cy = -E / 2;
    const rr = cx * cx + cy * cy - F;
    if (rr <= 0) return null;
    return { cx, cy, r: Math.sqrt(rr) };
  }

  function verdictFor(score: number) {
    if (score >= 97) return 'suspiciously round';
    if (score >= 90) return 'a fine instrument';
    if (score >= 80) return 'steady hand';
    if (score >= 65) return 'workshop grade';
    if (score >= 45) return 'a resolute ellipse';
    return 'abstract art';
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (!pts.length && !result) {
      ctx.fillStyle = faintColor;
      ctx.font = '12px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('draw a circle · one stroke, all the way around', W / 2, H / 2);
      ctx.textAlign = 'left';
      return;
    }
    if (pts.length >= 4) {
      for (const [lw, a] of [
        [9, 0.07],
        [2.6, 0.9],
      ] as const) {
        ctx.strokeStyle = lw > 3 ? brass(a) : inkColor;
        ctx.globalAlpha = lw > 3 ? 1 : a;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (result) {
      const { cx, cy, r, score } = result;
      ctx.setLineDash([1, 7]);
      ctx.strokeStyle = brass(0.75);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = brass(0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const tx = Math.max(70, Math.min(W - 70, cx));
      const ty = Math.max(56, Math.min(H - 30, cy - 8));
      ctx.save();
      ctx.shadowColor = brass(0.6);
      ctx.shadowBlur = 22;
      ctx.fillStyle = brass(0.96);
      ctx.font = '500 44px "Newsreader Variable", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${score.toFixed(1)}%`, tx, ty);
      ctx.restore();
      ctx.fillStyle = faintColor;
      ctx.font = '12px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(result.verdict, tx, ty + 22);
      ctx.textAlign = 'left';
    }
  }

  function finish() {
    if (!drawing) return;
    drawing = false;
    if (pts.length < 40) {
      status.textContent = 'too short · one stroke, all the way around';
      return;
    }
    const fit = fitCircle(pts);
    if (!fit || fit.r < 24) {
      status.textContent = 'draw it bigger';
      return;
    }
    const { cx, cy, r } = fit;

    const angs: number[] = [];
    for (let i = 0; i < pts.length; i += 2) angs.push(Math.atan2(pts[i + 1] - cy, pts[i] - cx));
    angs.sort((a, b) => a - b);
    let maxGap = angs[0] + Math.PI * 2 - angs[angs.length - 1];
    for (let i = 1; i < angs.length; i++) maxGap = Math.max(maxGap, angs[i] - angs[i - 1]);
    const swept = Math.PI * 2 - maxGap;
    if (swept < Math.PI * 2 * 0.85) {
      status.textContent = 'not closed · go all the way around';
      return;
    }

    let se = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const d = Math.hypot(pts[i] - cx, pts[i + 1] - cy) - r;
      se += d * d;
    }
    const cv = Math.sqrt(se / (pts.length / 2)) / r;
    const score = Math.min(99.9, Math.max(0, (1 - cv * 4) * 100));
    const verdict = verdictFor(score);
    result = { cx, cy, r, score, verdict };

    let note = '';
    if (score > best) {
      best = score;
      try {
        localStorage.setItem('circle-best', best.toFixed(1));
      } catch {}
      note = ' · new best';
      showBest();
    }
    status.textContent = `${score.toFixed(1)}% round · ${verdict}${note}`;
    render();
  }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = [];
    result = null;
    render();
  }

  canvas.addEventListener('pointerdown', (e) => {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    const r = canvas.getBoundingClientRect();
    pts = [e.clientX - r.left, e.clientY - r.top];
    result = null;
    drawing = true;
    status.textContent = 'drawing…';
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const r = canvas.getBoundingClientRect();
    pts.push(e.clientX - r.left, e.clientY - r.top);
    render();
  });
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);

  section.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
    pts = [];
    result = null;
    drawing = false;
    status.textContent = 'cleared · give it a slow, confident sweep';
    render();
  });

  window.addEventListener('themechange', () => {
    readPalette();
    render();
  });
  window.addEventListener('resize', resize);

  readPalette();
  resize();
  showBest();
  status.textContent = 'draw a circle · one stroke, all the way around';
}
