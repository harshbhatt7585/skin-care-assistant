# Skin Ritualist

Lightweight Vite + React experience where you upload a bare-faced photo, we run an on-device pixel scan, and OpenAI returns a markdown ritual plus a Serper-powered list of live products.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (never commit it) and add your OpenAI key (and optional Serper key if you want to enable the agent's web-search tool):
   ```env
   VITE_OPENAI_API_KEY=sk-your-key
   VITE_SERPER_API_KEY=serper-your-key
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Visit the printed URL, upload a clear photo, and let the assistant generate a ritual + shoppable suggestions.

## How It Works

- The image never leaves the browser; we use a hidden `<canvas>` to capture pixel data and build heuristics for hydration, oil balance, tone, barrier strength, and sensitivity.
- Those heuristics seed an OpenAI Responses run (`gpt-4o-mini`) that returns markdown with AM/PM rituals *and* a concise search query.
- We send that query to Serper (Google Shopping) to fetch live product listings and surface them with links so you can review/buy directly.

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build in `dist/`
- `npm run preview` – Preview the production bundle locally

## Security Notes

- The OpenAI key is injected client-side (`dangerouslyAllowBrowser`). For real deployments, proxy calls through your own backend and never expose secrets directly to browsers.
- Image analysis is heuristic and for educational use only. Always prompt users to patch test and consult licensed professionals for medical questions.
