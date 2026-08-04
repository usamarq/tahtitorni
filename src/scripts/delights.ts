/* Sitewide delights: the ⌘K palette, the Konami constellation code, and a
   console note. Loaded deferred on every page; a few KB, no framework. */

type Item = { t: string; href?: string; act?: string; k: string };

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readBrass() {
  const cs = getComputedStyle(document.documentElement);
  const h = cs.getPropertyValue('--accent-h').trim() || '42';
  const s = cs.getPropertyValue('--brass-s').trim() || '52%';
  const l = cs.getPropertyValue('--brass-l').trim() || '56%';
  return `${h} ${s} ${l}`;
}

/* ---------- toast ---------- */
let toastEl: HTMLElement | null = null;
let toastTimer = 0;
function toast(msg: string) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), 2200);
}

/* ---------- actions ---------- */
function toggleTheme() {
  const root = document.documentElement;
  const next = (root.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {}
  window.dispatchEvent(new CustomEvent('themechange'));
}
function setAccent(h: number) {
  document.documentElement.style.setProperty('--accent-h', String(h));
  try {
    localStorage.setItem('accent-h', String(h));
  } catch {}
  window.dispatchEvent(new CustomEvent('themechange'));
  const knob = document.querySelector<HTMLInputElement>('.knob input');
  if (knob) knob.value = String(h);
}
const ACTIONS: Record<string, () => void> = {
  theme: () => toggleTheme(),
  email: () => {
    navigator.clipboard?.writeText('usamarq10fi@gmail.com').then(
      () => toast('email copied'),
      () => toast('could not copy')
    );
  },
  'accent-random': () => {
    setAccent(Math.floor(Math.random() * 360));
    toast('accent shifted');
  },
  'accent-brass': () => {
    setAccent(42);
    toast('back to brass');
  },
  ask: () => {
    import('./assistant').then((m) => m.open());
  },
};

/* the nav "Ask" buttons lazy-load the assistant on first use */
for (const btn of document.querySelectorAll<HTMLElement>('.ask-open')) {
  btn.addEventListener('click', () => ACTIONS.ask());
}

/* ---------- palette ---------- */
function buildItems(): Item[] {
  const items: Item[] = [
    { t: 'Home', href: '/', k: 'page' },
    { t: 'Work', href: '/work/', k: 'page' },
    { t: 'CV', href: '/cv/', k: 'page' },
    { t: 'Playground', href: '/playground/', k: 'page' },
    { t: 'About', href: '/about/', k: 'page' },
    { t: 'Ask about Usama', act: 'ask', k: 'assistant' },
    { t: 'Toggle light / dark', act: 'theme', k: 'action' },
    { t: 'Copy email address', act: 'email', k: 'action' },
    { t: 'Shift the accent color', act: 'accent-random', k: 'action' },
    { t: 'Reset accent to brass', act: 'accent-brass', k: 'action' },
  ];
  try {
    const data = JSON.parse(document.getElementById('palette-data')?.textContent || '{}');
    for (const w of data.work || []) items.push({ t: w.t, href: w.href, k: w.k });
  } catch {}
  return items;
}

let cmdk: HTMLElement | null = null;
let input: HTMLInputElement;
let list: HTMLElement;
let items: Item[] = [];
let filtered: Item[] = [];
let sel = 0;
let lastFocus: Element | null = null;

function score(q: string, s: string) {
  const t = s.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  let i = 0;
  for (const c of t) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
}
function refresh() {
  const q = input.value.trim().toLowerCase();
  filtered = !q
    ? items
    : items
        .map((it) => ({ it, s: Math.max(score(q, it.t), score(q, it.k) - 1) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.it);
  sel = 0;
  render();
}
function render() {
  list.innerHTML = '';
  if (!filtered.length) {
    const li = document.createElement('li');
    li.className = 'none';
    li.textContent = 'nothing on this chart';
    list.appendChild(li);
    input.removeAttribute('aria-activedescendant');
    return;
  }
  filtered.forEach((it, i) => {
    const li = document.createElement('li');
    li.id = `cmdk-opt-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sel));
    const star = document.createElement('i');
    star.textContent = '✦';
    const label = document.createElement('span');
    label.textContent = it.t;
    const kick = document.createElement('span');
    kick.className = 'k';
    kick.textContent = it.k;
    li.append(star, label, kick);
    li.addEventListener('pointermove', () => {
      if (sel !== i) {
        sel = i;
        updateSel();
      }
    });
    li.addEventListener('click', () => activate(it));
    list.appendChild(li);
  });
  updateSel();
}
function updateSel() {
  [...list.children].forEach((el, i) => el.setAttribute('aria-selected', String(i === sel)));
  const el = list.children[sel] as HTMLElement | undefined;
  if (el) {
    input.setAttribute('aria-activedescendant', el.id);
    el.scrollIntoView({ block: 'nearest' });
  }
}
function activate(it: Item) {
  closePalette();
  if (it.href) location.href = it.href;
  else if (it.act) ACTIONS[it.act]?.();
}
function openPalette() {
  if (!cmdk) {
    items = buildItems();
    cmdk = document.createElement('div');
    cmdk.className = 'cmdk';
    cmdk.innerHTML = `
      <div class="cmdk-backdrop"></div>
      <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmdk-top"><i aria-hidden="true">✦</i><input type="text" placeholder="Where to?" aria-label="Search pages, work and actions" role="combobox" aria-expanded="true" aria-controls="cmdk-list" autocomplete="off" spellcheck="false" /></div>
        <ul class="cmdk-list" id="cmdk-list" role="listbox" aria-label="Results"></ul>
        <div class="cmdk-foot">↑↓ navigate · ↵ go · esc close</div>
      </div>`;
    document.body.appendChild(cmdk);
    input = cmdk.querySelector('input')!;
    list = cmdk.querySelector('.cmdk-list')!;
    cmdk.querySelector('.cmdk-backdrop')!.addEventListener('click', closePalette);
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        sel = (sel + 1) % filtered.length;
        updateSel();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel - 1 + filtered.length) % filtered.length;
        updateSel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[sel]) activate(filtered[sel]);
      } else if (e.key === 'Tab') {
        e.preventDefault();
      }
    });
  }
  lastFocus = document.activeElement;
  cmdk.hidden = false;
  input.value = '';
  refresh();
  input.focus();
}
function closePalette() {
  if (cmdk) cmdk.hidden = true;
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (cmdk && !cmdk.hidden) closePalette();
    else openPalette();
  } else if (e.key === 'Escape' && cmdk && !cmdk.hidden) {
    closePalette();
  }
});

/* ---------- konami ---------- */
const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let progress = 0;
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  progress = k === CODE[progress] ? progress + 1 : k === CODE[0] ? 1 : 0;
  if (progress === CODE.length) {
    progress = 0;
    if (reduced) toast('✦ constellation code accepted');
    else confetti();
  }
});

function confetti() {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const ctx = c.getContext('2d')!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth;
  const H = innerHeight;
  c.width = W * dpr;
  c.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const brass = readBrass();
  const cs = getComputedStyle(document.documentElement);
  const star = cs.getPropertyValue('--sky-star').trim() || '210, 222, 244';
  type P = { x: number; y: number; vx: number; vy: number; r: number; g: boolean; rot: number; vr: number; gold: boolean };
  const parts: P[] = [];
  for (let i = 0; i < 150; i++) {
    parts.push({
      x: W / 2 + (Math.random() - 0.5) * 160,
      y: H * 0.62,
      vx: (Math.random() - 0.5) * 11,
      vy: -5 - Math.random() * 7.5,
      r: 4 + Math.random() * 9,
      g: Math.random() < 0.55,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.22,
      gold: Math.random() < 0.6,
    });
  }
  let n = 0;
  const total = 150;
  (function tick() {
    n++;
    ctx.clearRect(0, 0, W, H);
    const fade = n > total * 0.6 ? 1 - (n - total * 0.6) / (total * 0.4) : 1;
    for (const p of parts) {
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const col = p.gold ? `hsl(${brass} / ${0.9 * fade})` : `rgba(${star}, ${0.85 * fade})`;
      if (p.g) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = col;
        ctx.font = `${p.r * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (n < total) requestAnimationFrame(tick);
    else c.remove();
  })();
  toast('✦ constellation code accepted');
}

/* ---------- declination ruler (wide screens only) ---------- */
{
  const mq = window.matchMedia('(min-width: 1440px)');
  let ruler: HTMLElement | null = null;
  let dot: HTMLElement | null = null;
  let raf = 0;

  function build() {
    if (ruler) return;
    ruler = document.createElement('div');
    ruler.className = 'decl';
    ruler.setAttribute('aria-hidden', 'true');
    ruler.innerHTML =
      '<span>+90°</span><div class="d-rail"><i class="d-dot"></i></div><span>+65°</span>';
    document.body.appendChild(ruler);
    dot = ruler.querySelector('.d-dot');
    place();
  }
  function teardown() {
    ruler?.remove();
    ruler = null;
    dot = null;
  }
  function place() {
    raf = 0;
    if (!dot) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    dot.style.top = `${(p * 100).toFixed(2)}%`;
  }
  const schedule = () => {
    if (ruler && !raf) raf = requestAnimationFrame(place);
  };

  if (mq.matches) build();
  mq.addEventListener('change', (e) => (e.matches ? build() : teardown()));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}

/* ---------- console note ---------- */
try {
  console.log(
    '%c✦ tähtitorni%c\nthe star tower of Usama Raheel · Oulu · 65°N\n%cctrl+K (⌘K) opens the palette · the 404 hides a game · ↑↑↓↓←→←→BA\n%ccode: github.com/usamarq',
    'color:#c9a654;font-size:16px;font-family:Georgia,serif',
    'color:#98a0b4;font-family:monospace',
    'color:#5f6880;font-family:monospace',
    'color:#5f6880;font-family:monospace'
  );
} catch {}
