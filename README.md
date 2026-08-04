# tähtitorni ✦ usamaraheel.vercel.app

*Tähtitorni*, Finnish for observatory: the star tower. The personal site of
Usama Raheel, AI Research Engineer in Oulu, Finland (65°N), built as a
night-sky atlas: every page carries its own starfield, every project its
own constellation.

## Stack

- [Astro 5](https://astro.build) static output, TypeScript, Tailwind CSS v4,
  MDX content collections.
- No front-end framework. Every interactive piece is vanilla TS + canvas.
- Newsreader / IBM Plex Sans / JetBrains Mono, self-hosted via Fontsource.

## Worth a look

- `src/components/Sky.astro` — the multi-instance constellation canvas.
  Glow is a wide low-alpha stroke under a thin bright one; when no mouse is
  over a band, a slow Lissajous cursor roams it so constellations form on
  their own. Pauses offscreen, static under `prefers-reduced-motion`.
- `src/components/Sigil.astro` — a deterministic constellation per work
  entry, seeded from its slug. Build-time SVG, zero JS.
- `scripts/train-digits.mjs` — trains the /playground digit model: a
  784-64-10 MLP on MNIST in pure Node, no dependencies, ~90 seconds to
  97.45% test accuracy, exported int8-quantized (68 KB) for pure-TS
  inference in the browser.
- `src/scripts/circle-game.ts` — draw a circle, get judged by a Kasa
  least-squares fit.
- `src/pages/404.astro` — a star-charting mini-game.
- `src/scripts/assistant.ts` + `worker/` — the "Ask" panel: a site
  assistant grounded in `/assistant-knowledge.txt` (assembled at build time
  from the same data as the pages). The browser talks to a ~100-line
  Cloudflare Worker relay that holds the Gemini key, pins the system
  prompt and caps, rate-limits per IP, and streams the answer through.
- Ctrl+K (⌘K) opens a command palette. There is also a Konami code.

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run preview  # serve the build
```

### The assistant's relay

The Ask panel talks to `worker/` (Cloudflare Workers free tier, deployed
as `tahtitorni-ask`). The Gemini key (AI Studio free tier — no billing
attached) lives only in Cloudflare's secret store:

```sh
npx wrangler deploy --config worker/wrangler.toml          # deploy changes
npx wrangler secret put GEMINI_API_KEY --config worker/wrangler.toml  # rotate key
```

The model is the rolling `gemini-flash-latest` alias (set in
`worker/wrangler.toml`), so retired model names can't break it. The site
reads the relay URL from a constant in `src/scripts/assistant.ts`
(override with `PUBLIC_ASK_ENDPOINT` at build time). Wrangler is pinned
to 4.85.0, the last release that runs on Node 20.

`node scripts/train-digits.mjs` regenerates `public/models/digits.json`
(MNIST downloads are cached in the OS temp dir).

## Print

`/cv` ships a print stylesheet: Ctrl+P produces a clean PDF of the full CV.
