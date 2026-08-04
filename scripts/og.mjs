/* Generates public/og.png and public/og-playground.png (1200x630) in the
   observatory style. Run from the repo root: node scripts/og.mjs
   Uses system fonts (Georgia, Segoe UI, Consolas), so regenerate on Windows. */
import sharp from 'sharp';

const star = (cx, cy, s) =>
  `<path d="M ${cx} ${cy - s} L ${cx + s * 0.32} ${cy - s * 0.32} L ${cx + s} ${cy} L ${cx + s * 0.32} ${cy + s * 0.32} L ${cx} ${cy + s} L ${cx - s * 0.32} ${cy + s * 0.32} L ${cx - s} ${cy} L ${cx - s * 0.32} ${cy - s * 0.32} Z" fill="#c9a654"/>`;

const makeDust = (count) =>
  Array.from({ length: count }, () => {
    const x = (Math.random() * 1200).toFixed(1);
    const y = (Math.random() * 630).toFixed(1);
    const r = Math.random() < 0.12 ? 2 : 1.1;
    const o = (0.15 + Math.random() * 0.45).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="rgb(210,222,244)" opacity="${o}"/>`;
  }).join('\n  ');

const defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b0f1b"/>
      <stop offset="0.4" stop-color="#0d1220"/>
      <stop offset="1" stop-color="#0d1220"/>
    </linearGradient>
  </defs>`;

/* ---------------------------------------------------------------- og.png */

const home = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${makeDust(80)}
  ${star(104, 143, 11)}
  <text x="130" y="152" font-family="Consolas, monospace" font-size="23" letter-spacing="7" fill="#c9a654">AI RESEARCH ENGINEER</text>
  <text x="92" y="308" font-family="Georgia, serif" font-size="106" fill="#e9e5da">Usama Raheel</text>
  <text x="96" y="375" font-family="Segoe UI, sans-serif" font-size="29" fill="#98a0b4">Machine learning systems, built and evaluated · Oulu, Finland</text>
  <line x1="96" y1="440" x2="1104" y2="440" stroke="#212a44" stroke-width="2"/>
  <text x="96" y="492" font-family="Consolas, monospace" font-size="25" fill="#c9a654">82.7% answer quality · MRR 0.96 · arXiv cs.LG co-author</text>
  <text x="96" y="566" font-family="Consolas, monospace" font-size="21" fill="#5f6880">usamaraheel.vercel.app</text>
</svg>`;

/* ----------------------------------------------------- og-playground.png */
/* A four-panel montage: optimizer contours, digit bars, an imperfect
   circle with its score, and flow-field trails. */

const PX = 96; // panel row left edge
const PY = 268;
const PW = 250;
const PH = 240;
const GAP = 22;
const panelX = (i) => PX + i * (PW + GAP);

const panelFrame = (i, label) => `
  <rect x="${panelX(i)}" y="${PY}" width="${PW}" height="${PH}" rx="5" fill="#111729" stroke="#212a44" stroke-width="2"/>
  <text x="${panelX(i) + 16}" y="${PY + PH - 16}" font-family="Consolas, monospace" font-size="15" letter-spacing="2" fill="#5f6880">${label}</text>`;

/* 01: nested contour rings, four brass minima, one descending trail */
const contourArt = (() => {
  const cx = panelX(0) + PW / 2;
  const cy = PY + 104;
  const rings = [92, 72, 54, 38, 24]
    .map(
      (r, i) =>
        `<ellipse cx="${cx + i * 4}" cy="${cy + i * 2}" rx="${r}" ry="${r * 0.68}" fill="none" stroke="#2a3554" stroke-width="1.4" opacity="${0.5 + i * 0.1}"/>`
    )
    .join('');
  const minima = [
    [cx + 16, cy + 10],
    [cx - 62, cy - 40],
    [cx - 74, cy + 52],
    [cx + 74, cy + 48],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#c9a654" opacity="0.9"/>`)
    .join('');
  const trail = `M ${panelX(0) + 26} ${PY + 30} Q ${cx - 40} ${cy - 50} ${cx - 12} ${cy - 12} T ${cx + 16} ${cy + 10}`;
  return `${rings}${minima}
    <path d="${trail}" fill="none" stroke="#c9a654" stroke-width="5" opacity="0.14" stroke-linecap="round"/>
    <path d="${trail}" fill="none" stroke="#c9a654" stroke-width="1.8" opacity="0.9" stroke-linecap="round"/>`;
})();

/* 02: the network's guess and its probability bars */
const digitArt = (() => {
  const x0 = panelX(1);
  const bars = Array.from({ length: 10 }, (_, i) => {
    const h = i === 7 ? 92 : 6 + Math.random() * 22;
    const bx = x0 + 108 + i * 12.4;
    const fill = i === 7 ? '#c9a654' : 'rgba(210,222,244,0.25)';
    return `<rect x="${bx}" y="${PY + 158 - h}" width="9" height="${h}" fill="${fill}"/>`;
  }).join('');
  return `<text x="${x0 + 52}" y="${PY + 152}" font-family="Georgia, serif" font-size="120" fill="#c9a654" text-anchor="middle">7</text>${bars}`;
})();

/* 03: a wobbly hand-drawn circle, its least-squares fit, the score */
const circleArt = (() => {
  const cx = panelX(2) + PW / 2;
  const cy = PY + 102;
  const R = 66;
  const pts = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * Math.PI * 1.96 - Math.PI / 2;
    const r = R * (1 + 0.05 * Math.sin(3 * a + 0.8));
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#c9a654" stroke-width="1.4" stroke-dasharray="1 7" opacity="0.75" stroke-linecap="round"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="rgb(210,222,244)" stroke-width="2.4" opacity="0.9" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${cx}" y="${cy + 12}" font-family="Georgia, serif" font-size="34" fill="#c9a654" text-anchor="middle">94.2%</text>`;
})();

/* 04: flow-field trails */
const flowArt = (() => {
  const x0 = panelX(3);
  const paths = [];
  for (let i = 0; i < 16; i++) {
    const y = PY + 24 + i * 12 + Math.random() * 6;
    const amp = 8 + Math.random() * 16;
    const phase = Math.random() * 40;
    const d = `M ${x0 + 18} ${y} q 40 ${-amp} 80 ${(Math.random() - 0.5) * 14} t 80 ${(Math.random() - 0.5) * 20 - phase * 0.2} t 54 ${(Math.random() - 0.5) * 12}`;
    const brassy = i % 5 === 0;
    paths.push(
      `<path d="${d}" fill="none" stroke="${brassy ? '#c9a654' : 'rgb(210,222,244)'}" stroke-width="1.2" opacity="${brassy ? 0.65 : 0.22}" stroke-linecap="round"/>`
    );
  }
  return paths.join('');
})();

const playground = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${makeDust(60)}
  ${star(104, 110, 11)}
  <text x="130" y="119" font-family="Consolas, monospace" font-size="23" letter-spacing="7" fill="#c9a654">PLAYGROUND · TOYS, NOT WORK</text>
  <text x="92" y="216" font-family="Georgia, serif" font-size="72" fill="#e9e5da">Small experiments, <tspan font-style="italic">running live</tspan></text>
  ${panelFrame(0, '01 OPTIMIZERS')}${contourArt}
  ${panelFrame(1, '02 DIGITS')}${digitArt}
  ${panelFrame(2, '03 CIRCLE')}${circleArt}
  ${panelFrame(3, '04 FLOW')}${flowArt}
  <text x="96" y="576" font-family="Consolas, monospace" font-size="21" fill="#5f6880">usamaraheel.vercel.app/playground · no servers, just canvas</text>
</svg>`;

await sharp(Buffer.from(home)).png().toFile('public/og.png');
console.log('wrote public/og.png');
await sharp(Buffer.from(playground)).png().toFile('public/og-playground.png');
console.log('wrote public/og-playground.png');
