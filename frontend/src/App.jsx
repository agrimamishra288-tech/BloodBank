import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Donors from './pages/Donors'
import Inventory from './pages/Inventory'
import Requests from './pages/Requests'
import Donations from './pages/Donations'
import Banks from './pages/Banks'
import PublicData from './pages/PublicData'

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <Navbar />
      <main className="flex-1 md:ml-64 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <>
      <Toaster
        position="top-right"
        gutter={12}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0F1629',
            color: '#fff',
            border: '1px solid #1E2744',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: { primary: '#2ECC71', secondary: '#fff' },
            style: { borderLeft: '3px solid #2ECC71' },
          },
          error: {
            iconTheme: { primary: '#E63946', secondary: '#fff' },
            style: { borderLeft: '3px solid #E63946' },
          },
        }}
      />

      <Routes location={location} key={location.pathname}>
        <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/"          element={<Layout><Dashboard /></Layout>} />
          <Route path="/donors"    element={<Layout><Donors /></Layout>} />
          <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
          <Route path="/requests"  element={<Layout><Requests /></Layout>} />
          <Route path="/donations" element={<Layout><Donations /></Layout>} />
          <Route path="/banks"     element={<Layout><Banks /></Layout>} />
          <Route path="/public-data" element={<Layout><PublicData /></Layout>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
