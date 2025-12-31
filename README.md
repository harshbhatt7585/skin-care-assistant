# Skin Chat Ritualist

Lightweight Vite + React experience where a user uploads a bare-faced photo, the app runs a quick on-device pixel analysis, and an OpenAI-powered cosmetist chats through AM/PM product suggestions.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (never commit it) and add your OpenAI key:
   ```env
   VITE_OPENAI_API_KEY=sk-your-key
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Visit the printed URL, upload a clear photo, and start chatting with the assistant.

## How It Works

- The image never leaves the browser; we use a hidden `<canvas>` to capture pixel data and build heuristics for hydration, oil balance, tone, barrier strength, and sensitivity.
- Those signals seed an OpenAI Responses run (`gpt-4o-mini`) which produces the first routine suggestion.
- Follow-up questions are handled in a chat UI that keeps the scan context in every turn so the cosmetist can tailor answers.

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build in `dist/`
- `npm run preview` – Preview the production bundle locally

## Security Notes

- The OpenAI key is injected client-side (`dangerouslyAllowBrowser`). For real deployments, proxy calls through your own backend and never expose secrets directly to browsers.
- Image analysis is heuristic and for educational use only. Always prompt users to patch test and consult licensed professionals for medical questions.
