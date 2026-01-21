import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import App from './App'
import SignIn from './components/SignIn'
import Landing from './components/Landing'

type RouteProps = {
  user: User | null
  children: ReactNode
}

const ProtectedRoute = ({ user, children }: RouteProps) => {
  if (!user) {
    return <Navigate to="/signin" replace />
  }
  return <>{children}</>
}

const PublicRoute = ({ user, children }: RouteProps) => {
  if (user) {
    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}

const Root = () => {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      console.log('[firebase] user', nextUser)
      setUser(nextUser)
      setChecking(false)
    })

    return () => unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="page auth-checking">
        <div className="auth-loader">
          <div className="auth-loader__orb">
            <div className="auth-loader__ring" />
            <div className="auth-loader__ring" />
            <div className="auth-loader__ring" />
            <div className="auth-loader__glow" />
          </div>
          <h1 className="auth-loader__brand">
            <span className="auth-loader__brand-glow" aria-hidden="true">Glowly</span>
            <span className="auth-loader__brand-text">Glowly</span>
          </h1>
          <p className="auth-loader__status">Preparing your experience…</p>
          <div className="auth-loader__dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute user={user}>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/signin"
          element={
            <PublicRoute user={user}>
              <SignIn />
            </PublicRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute user={user}>
              <App user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/home" : "/"} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default Root
