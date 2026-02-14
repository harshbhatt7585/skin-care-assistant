# Styra

Styra is a fashion + beauty shopping app built with Vite + React and Firebase auth. The frontend now centers on:

- Curated product catalog across fashion, beauty, accessories, and footwear
- Search, filtering, sorting, wishlist toggles, and cart management
- Membership-focused landing and pricing experiences

## Getting Started

### Frontend

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (never commit it):
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

### Backend API (Optional / Legacy)

A FastAPI backend is still present under `backend/` from previous workflows. If you need those endpoints:

1. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Add `backend/.env` keys and run:
   ```bash
   uvicorn app:app --reload
   ```

## Scripts

- `npm run dev` – Vite dev server
- `npm run build` – Production build in `dist/`
- `npm run preview` – Preview the production bundle locally
