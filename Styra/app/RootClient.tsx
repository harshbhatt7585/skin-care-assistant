'use client'

import Root from '../src/Root'
import { initializeFirebase } from '../src/lib/firebase'

export default function RootClient() {
  initializeFirebase()
  return <Root />
}
