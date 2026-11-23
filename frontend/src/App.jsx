import { useEffect } from 'react'
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }) }, [pathname])
  return null
}

function Layout({ children }) {
  return (
    <div className="app-shell flex min-h-screen bg-dark-900">
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
            background: 'var(--panel)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: '14px',
            fontSize: '13px',
            fontFamily: 'var(--font-ui)',
            boxShadow: 'var(--shadow-card)',
          },
          success: {
            iconTheme: { primary: 'var(--sage)', secondary: 'var(--panel)' },
            style: { borderLeft: '3px solid var(--sage)' },
          },
          error: {
            iconTheme: { primary: 'var(--rose)', secondary: 'var(--panel)' },
            style: { borderLeft: '3px solid var(--rose)' },
          },
        }}
      />

      <ScrollToTop />

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
