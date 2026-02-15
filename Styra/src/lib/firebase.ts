import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAnalytics, type Analytics } from 'firebase/analytics'

const firebaseEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const getFirebaseConfig = (): FirebaseOptions => {
  const missing = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseEnv.apiKey],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseEnv.authDomain],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseEnv.projectId],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', firebaseEnv.storageBucket],
    ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', firebaseEnv.messagingSenderId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseEnv.appId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) {
    throw new Error(`Missing Firebase environment values: ${missing.join(', ')}`)
  }

  return {
    apiKey: firebaseEnv.apiKey,
    authDomain: firebaseEnv.authDomain,
    projectId: firebaseEnv.projectId,
    storageBucket: firebaseEnv.storageBucket,
    messagingSenderId: firebaseEnv.messagingSenderId,
    appId: firebaseEnv.appId,
    measurementId: firebaseEnv.measurementId,
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

  if (!firebaseEnv.measurementId) {
    return null
  }

  if (firebaseAnalytics) {
    return firebaseAnalytics
  }

  firebaseAnalytics = getAnalytics(getFirebaseApp())
  return firebaseAnalytics
}
