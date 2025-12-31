# Skin & Cosmetist Assistant

A Vite + React + TypeScript experience for scanning a face (camera or upload), interpreting tone + hydration + barrier signals, and drafting ingredient-forward routines powered by OpenAI.

## Highlights

- Live camera capture or photo upload with side-by-side preview so users can reframe and rescan quickly.
- Lightweight, on-device pixel analysis that infers hydration, tone evenness, oil balance, barrier strength, and sensitivity risk as 0‑100 signals.
- Ritual builder that collects lifestyle notes, climate, and preferred focus areas before calling OpenAI (`gpt-4o-mini`) for AM/PM product recommendations.
- Formula-scout agent that sends your ingredient brief to SerpAPI (Google Shopping) and lets OpenAI highlight the closest over-the-counter matches.
- Modern UI with responsive layout, quick status badges, and markdown-friendly AI output block.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create an environment file** (never commit it):
   ```bash
   cp .env.example .env.local # create this file if it does not exist yet
   ```
   and add your keys:
   ```env
   VITE_OPENAI_API_KEY=sk-your-key
   VITE_SERP_API_KEY=serp-your-key
   ```
3. **Run the dev server**
   ```bash
   npm run dev
   ```
4. Visit the printed URL, allow camera access (or upload a photo), capture a frame, describe your concerns, then click **Build my ritual**.

## Formula Scout Agent

- Uses [SerpAPI](https://serpapi.com/) (Google Shopping engine) to fetch public product listings that reference your ingredient brief. Supply `VITE_SERP_API_KEY` to enable it.
- The agent hands those hits to `gpt-4o-mini`, asking for JSON-formatted picks with rationale + retailer notes.
- Results render inside the UI with outbound links so users can review products directly at the source.

## Security Notes

- The OpenAI call happens in the browser through the official SDK with `dangerouslyAllowBrowser` enabled. For production you should proxy requests through your own backend and never expose the API key to end users.
- The SerpAPI key is also used client-side here for convenience. In production, proxy it as well to avoid leaking credentials or hitting quota abuse.
- The pixel analysis is heuristic (no biometrics/storage) and is only used to craft a better prompt. Always remind users to patch test and consult professionals for medical concerns.

## Available Scripts

- `npm run dev` – Vite dev server with hot reload.
- `npm run build` – Production build output in `dist/`.
- `npm run preview` – Preview the production build locally.

## Tech Stack

- React 18 + TypeScript, bundled via Vite.
- OpenAI SDK for LLM calls (`gpt-4o-mini`).
- Modern CSS with CSS variables for quick theming.

Feel free to evolve the heuristics, add storage, or wire this UI to a secured API gateway when moving beyond prototypes.
