import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'
import { initializeFirebase } from './lib/firebase'

const firebaseApp = initializeFirebase()
console.log('[firebase] initialized app', firebaseApp.name)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
