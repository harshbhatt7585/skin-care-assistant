# Styra

Styra is a fashion + beauty shopping app built with Next.js + React and Firebase auth.

## Getting Started

### Frontend (Next.js)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (never commit it):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
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

- `npm run dev` – Next.js dev server
- `npm run build` – Production build
- `npm run start` – Run production server
