# Skin Ritualist

Lightweight Vite + React experience where you upload a bare-faced photo, we run an on-device pixel scan, and OpenAI returns a markdown ritual plus a Serper-powered list of live products.

## Getting Started

### Frontend

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (never commit it), add your Firebase settings, and point the app at your local API:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Visit the printed URL, upload a clear photo, and let the assistant generate a ritual + shoppable suggestions.

### Backend API

1. Create a virtualenv and install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Create `backend/.env` with your keys (never commit it):
   ```env
   OPENAI_API_KEY=sk-your-key
   SERPER_API_KEY=serper-your-key
   GEMINI_API_KEY=gemini-your-key
   ```
   > Firebase credentials continue to load from `firebase-service.json` as before.
3. Run the API locally:
   ```bash
   uvicorn app:app --reload
   ```

## How It Works

- The browser still uses a hidden `<canvas>` to capture pixel data, but the base64 payload is now streamed to the backend where the cosmetic agent lives.
- The backend cosmetist agent (OpenAI `gpt-5-mini` + Serper tool call) emits progress events for verification, scanning, analyzing, and shopping so the UI can show live status updates as it works.
- Shopping payloads are still sourced from Serper (Google Shopping) and returned in a normalized JSON format for the React UI to render.

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build in `dist/`
- `npm run preview` – Preview the production bundle locally

## Security Notes

- All OpenAI/Serper calls now originate from the backend service so secrets stay server-side. Keep `backend/.env` private and rotate keys regularly.
- Image analysis is heuristic and for educational use only. Always prompt users to patch test and consult licensed professionals for medical questions.
