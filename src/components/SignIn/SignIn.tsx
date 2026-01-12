import { useState } from 'react'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import './SignIn.css'

const SignIn = () => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="sign-in">
      <div className="sign-in__panel">
        <h1>Sign In</h1>
        <p>Singin with following options.</p>
        <button type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
          {isLoading ? 'Connecting…' : 'Continue with Google'}
        </button>
        {error ? <p className="sign-in__error">{error}</p> : null}
      </div>
    </div>
  )
}

export default SignIn
