'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { initializeFirebase } from '../lib/firebase'

type AuthSession = {
  user: User | null
  checking: boolean
}

export const useAuthSession = (): AuthSession => {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    initializeFirebase()
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setChecking(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, checking }
}
