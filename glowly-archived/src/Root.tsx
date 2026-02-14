import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import App from './App'
import SignIn from './components/SignIn'
import Landing from './components/Landing'
import Loader from './components/Loader/Loader'
import Pricing from './components/Pricing/Pricing'

type RouteProps = {
  user: User | null
  children: ReactNode
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
      <div className="page auth-checking" aria-busy="true" aria-live="polite">
        <div className="global-loader">
          <Loader />
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
              <Landing user={user} />
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
          path="/pricing"
          element={
            <PublicRoute user={user}>
              <Pricing />
            </PublicRoute>
          }
        />
        <Route
          path="/home"
          element={
            <App user={user} />
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
