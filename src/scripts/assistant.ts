/* The observatory assistant: a chat panel that answers questions about
   Usama and helps navigate the site. Talks to a tiny Cloudflare Worker
   relay (worker/) that holds the model key, pins the system prompt and
   caps server-side, and streams Gemini's SSE straight through. The site
   itself stays static. Lazy-loaded by delights.ts on first open. */

const ENDPOINT =
  (import.meta.env.PUBLIC_ASK_ENDPOINT as string | undefined)?.trim() ||
  'https://tahtitorni-ask.usamarq.workers.dev';
const ONLINE = ENDPOINT.startsWith('https://');

const STARTERS = [
  'What is his thesis about?',
  'Which projects use deep learning?',
  'What did he do before the MSc?',
  'How do I reach him?',
];

type Turn = { role: 'user' | 'model'; text: string };

let root: HTMLElement | null = null;
let messagesEl: HTMLElement | null = null;
let inputEl: HTMLInputElement | null = null;
let sendBtn: HTMLButtonElement | null = null;
let startersEl: HTMLElement | null = null;
let lastFocus: HTMLElement | null = null;

const history: Turn[] = [];
let busy = false;
let aborter: AbortController | null = null;

/* ---------- minimal, escape-first markdown: links, bold, italics, bullets ---------- */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function render(md: string) {
  let h = esc(md);
  h = h.replace(/\[([^\]]+)\]\((\/[^\s)]*|https?:\/\/[^\s)]+)\)/g, (_m, label, href) => {
    const ext = /^https?:/.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/^[-•*] +(.*)$/gm, '<span class="li">✦ $1</span>');
  /* single-asterisk emphasis, after the bullet pass so a leading "* " is
     never taken for an opening star; no space just inside either star */
  h = h.replace(/*(S(?:[^*
]*S)?)*/g, '<em>$1</em>');
  return h.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
}

/* ---------- panel ---------- */
function build() {
  if (root) return;
  root = document.createElement('div');
  root.className = 'ask';
  root.hidden = true;
  root.innerHTML = `
    <div class="ask-backdrop"></div>
    <div class="ask-panel" role="dialog" aria-modal="true" aria-label="Ask about Usama">
      <div class="ask-top">
        <i aria-hidden="true">✦</i>
        <span class="ask-title">Ask about Usama</span>
        <button class="ask-close" aria-label="Close">✕</button>
      </div>
      <div class="ask-messages" aria-live="polite"></div>
      <div class="ask-starters"></div>
      <form class="ask-form">
        <input type="text" maxlength="300" placeholder="Ask about the work, the thesis, the site…" aria-label="Your question" />
        <button type="submit" class="ask-send" aria-label="Send">→</button>
      </form>
      <p class="ask-foot">runs on a free-tier model · questions pass through a tiny relay, not stored by this site · answers may err — the <a href="/cv">CV</a> is the record</p>
    </div>`;
  document.body.appendChild(root);

  messagesEl = root.querySelector('.ask-messages');
  inputEl = root.querySelector('input');
  sendBtn = root.querySelector('.ask-send');
  startersEl = root.querySelector('.ask-starters');

  for (const q of STARTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    b.addEventListener('click', () => ask(q));
    startersEl!.appendChild(b);
  }

  root.querySelector('.ask-backdrop')!.addEventListener('click', close);
  root.querySelector('.ask-close')!.addEventListener('click', close);
  root.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') close();
  });
  root.querySelector('.ask-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = inputEl!.value.trim();
    if (q) ask(q);
  });
  /* internal links navigate and close the panel */
  messagesEl!.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a');
    if (a && a.getAttribute('href')?.startsWith('/')) close();
  });
}

function addMessage(kind: 'user' | 'model' | 'note', html: string) {
  const div = document.createElement('div');
  div.className = `ask-msg ${kind}`;
  div.innerHTML = html;
  messagesEl!.appendChild(div);
  messagesEl!.scrollTop = messagesEl!.scrollHeight;
  return div;
}

function setBusy(b: boolean) {
  busy = b;
  if (inputEl) inputEl.disabled = b;
  if (sendBtn) sendBtn.disabled = b;
}

export function open() {
  build();
  lastFocus = document.activeElement as HTMLElement;
  root!.hidden = false;
  document.body.style.overflow = 'hidden';
  inputEl?.focus();
  if (!ONLINE && !messagesEl!.childElementCount) {
    addMessage(
      'note',
      `The assistant is resting in this build (no model key configured). Email works around the clock: <a href="mailto:usamarq10fi@gmail.com">usamarq10fi@gmail.com</a>`
    );
  }
}

export function close() {
  if (!root) return;
  root.hidden = true;
  document.body.style.overflow = '';
  aborter?.abort();
  setBusy(false);
  lastFocus?.focus();
}

/* ---------- the conversation ---------- */
function failureText(status?: number, reason = '') {
  const email = ' You can always email <a href="mailto:usamarq10fi@gmail.com">usamarq10fi@gmail.com</a>.';
  if (status === 429 || reason === 'RESOURCE_EXHAUSTED')
    return 'The assistant is either getting many questions right now or has used its free stargazing quota for today. Try again in a minute.' + email;
  if (reason === 'UNAVAILABLE' || reason === 'TIMEOUT' || status === 503 || status === 504)
    return 'The model behind the assistant is overloaded or slow right now. Try again in a minute.' + email;
  if (status === 403) return 'The assistant cannot take questions from here.' + email;
  return 'Something went wrong between here and the model. Try once more.' + email;
}

async function ask(question: string) {
  if (busy) return;
  if (!ONLINE) {
    inputEl!.value = '';
    return;
  }
  startersEl!.style.display = 'none';
  inputEl!.value = '';
  addMessage('user', esc(question));
  const pending = addMessage('model', '<span class="ask-think" aria-label="thinking">✦</span>');
  setBusy(true);

  /* the user turn joins history only if it gets a completed answer, so a
     failed or aborted turn can never leave consecutive user messages */
  let answered = false;
  try {
    aborter = new AbortController();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: aborter.signal,
      body: JSON.stringify({ question, history: history.slice(-10) }),
    });
    if (!res.ok || !res.body) {
      let reason = '';
      try {
        reason = String((await res.json())?.reason ?? '');
      } catch {
        /* no json body */
      }
      pending.innerHTML = failureText(res.status, reason);
      return;
    }

    /* SSE: lines of `data: {...}` with incremental candidate text */
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        if (!line.startsWith('data: ')) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          const text = chunk.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
          if (text) {
            answer += text;
            pending.innerHTML = render(answer);
            messagesEl!.scrollTop = messagesEl!.scrollHeight;
          }
        } catch {
          /* ignore partial json */
        }
      }
    }
    if (!answer) {
      pending.innerHTML = failureText();
      return;
    }
    history.push({ role: 'user', text: question }, { role: 'model', text: answer });
    answered = true;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') pending.innerHTML = failureText();
  } finally {
    if (!answered && pending.querySelector('.ask-think')) pending.remove();
    setBusy(false);
    aborter = null;
    inputEl?.focus();
  }
}
