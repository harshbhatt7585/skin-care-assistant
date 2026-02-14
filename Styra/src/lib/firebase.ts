import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAnalytics, type Analytics } from 'firebase/analytics'

const getFirebaseConfig = (): FirebaseOptions => {
  const requiredEnvKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const

  const missing = requiredEnvKeys.filter((key) => !import.meta.env[key])

  if (missing.length) {
    throw new Error(`Missing Firebase environment values: ${missing.join(', ')}`)
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }
}

let firebaseApp: FirebaseApp | null = null
let firebaseAnalytics: Analytics | null = null

export const initializeFirebase = (): FirebaseApp => {
  if (firebaseApp) {
    console.log('Firebase already initialized')
    return firebaseApp
  }

  firebaseApp = getApps().length ? getApps()[0] : initializeApp(getFirebaseConfig())
  return firebaseApp
}

export const getFirebaseApp = (): FirebaseApp => {
  return firebaseApp ?? initializeFirebase()
}

export const initializeFirebaseAnalytics = (): Analytics | null => {
  if (typeof window === 'undefined') {
    return null
  }

  if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    return null
  }

  if (firebaseAnalytics) {
    return firebaseAnalytics
  }

  firebaseAnalytics = getAnalytics(getFirebaseApp())
  return firebaseAnalytics
}
