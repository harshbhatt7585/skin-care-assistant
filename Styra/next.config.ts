import type { NextConfig } from 'next'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const pick = (...values: Array<string | undefined>) => {
  for (const value of values) {
    if (value) return value
  }
  return undefined
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: pick(
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_API_URL,
      process.env.VITE_API_URL,
      'http://localhost:8000'
    ),
    NEXT_PUBLIC_FIREBASE_API_KEY: pick(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      process.env.NEXT_FIREBASE_API_KEY,
      process.env.FIREBASE_API_KEY,
      process.env.VITE_FIREBASE_API_KEY
    ),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: pick(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      process.env.NEXT_FIREBASE_AUTH_DOMAIN,
      process.env.FIREBASE_AUTH_DOMAIN,
      process.env.VITE_FIREBASE_AUTH_DOMAIN
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: pick(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      process.env.NEXT_FIREBASE_PROJECT_ID,
      process.env.FIREBASE_PROJECT_ID,
      process.env.VITE_FIREBASE_PROJECT_ID
    ),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: pick(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      process.env.NEXT_FIREBASE_STORAGE_BUCKET,
      process.env.FIREBASE_STORAGE_BUCKET,
      process.env.VITE_FIREBASE_STORAGE_BUCKET
    ),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: pick(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      process.env.NEXT_FIREBASE_MESSAGING_SENDER_ID,
      process.env.FIREBASE_MESSAGING_SENDER_ID,
      process.env.MESSAGING_SENDER_ID,
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    ),
    NEXT_PUBLIC_FIREBASE_APP_ID: pick(
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      process.env.NEXT_FIREBASE_APP_ID,
      process.env.FIREBASE_APP_ID,
      process.env.VITE_FIREBASE_APP_ID
    ),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: pick(
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      process.env.NEXT_FIREBASE_MEASUREMENT_ID,
      process.env.FIREBASE_MEASUREMENT_ID,
      process.env.VITE_FIREBASE_MEASUREMENT_ID
    ),
  },
}

export default nextConfig
