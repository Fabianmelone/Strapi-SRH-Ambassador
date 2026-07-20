import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// App.css intentionally empty
import { AuthProvider, useAuth } from './context/AuthContext'
import { canSeeSection } from './permissions'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Events from './pages/Events'
import News from './pages/News'
import Locations from './pages/Locations'
import Materials from './pages/Materials'

function ProtectedRoute({ section, children }: { section?: string; children: React.ReactNode }) {
  const { user, loading, capabilities, accessLoading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (section) {
    if (accessLoading) return <Layout>{null}</Layout>
    if (!canSeeSection(capabilities, section)) return <Navigate to="/" replace />
  }
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute section="bookings"><Bookings /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute section="events"><Events /></ProtectedRoute>} />
      <Route path="/news" element={<ProtectedRoute section="news"><News /></ProtectedRoute>} />
      <Route path="/locations" element={<ProtectedRoute section="locations"><Locations /></ProtectedRoute>} />
      <Route path="/materials" element={<ProtectedRoute section="materials"><Materials /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
