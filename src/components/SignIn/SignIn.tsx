import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth'
import { registerUser, getUser,  } from '../../api/auth'
import type { User as UserType } from '../../types/auth'
import './SignIn.css'

const SignIn = () => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()


  const checkUserExists = async (uid: string): Promise<User | false> => {
    const response = await getUser(uid)
    if (response.exists) {
      return response.user
    }
    return false  
  }


  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      let currentUser = auth.currentUser
      const user = await checkUserExists(currentUser?.uid)
      if (!user) {
        const now = new Date().toISOString()
        const userDetails: UserType  = {
          personal: {
            email: currentUser?.email,
            name: currentUser?.displayName,
            uid: currentUser?.uid,
          },
          created_at: now,
        }
        await registerUser(userDetails)
      }
      // Navigation will be handled automatically by Root component
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="sign-in">
      <button 
        className="sign-in__back"
        onClick={() => navigate('/')}
        aria-label="Go back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
      <div className="sign-in__panel">
        <h1 className="brand-logo">
          <span className="brand-logo__glow" aria-hidden="true">Glowly</span>
          <span className="brand-logo__text">Glowly</span>
        </h1>
        <h2>Welcome Back</h2>
        <p>Sign in to continue your skincare journey</p>
        <button type="button" className="sign-in__google" onClick={handleGoogleSignIn} disabled={isLoading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isLoading ? 'Connecting…' : 'Continue with Google'}
        </button>
        {error ? <p className="sign-in__error">{error}</p> : null}
      </div>
    </div>
  )
}

export default SignIn
