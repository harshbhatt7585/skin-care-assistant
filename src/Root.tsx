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
      <div className="page">
        <p>Checking authentication…</p>
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
