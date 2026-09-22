import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.ts'
import { LoadingScreen } from './LoadingScreen.tsx'

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}
