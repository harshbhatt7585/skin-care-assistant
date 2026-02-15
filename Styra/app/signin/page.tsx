'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignIn from '../../src/components/SignIn'
import Loader from '../../src/components/Loader/Loader'
import { useAuthSession } from '../../src/hooks/useAuthSession'

export default function SignInPage() {
  const router = useRouter()
  const { user, checking } = useAuthSession()

  useEffect(() => {
    if (!checking && user) {
      router.replace('/home')
    }
  }, [checking, user, router])

  if (checking) {
    return (
      <div className="page auth-checking" aria-busy="true" aria-live="polite">
        <div className="global-loader">
          <Loader />
        </div>
      </div>
    )
  }

  return <SignIn />
}
