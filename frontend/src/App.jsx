import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar      from './components/Navbar'
import Login       from './pages/Login'
import Register    from './pages/Register'
import Dashboard   from './pages/Dashboard'
import Donors      from './pages/Donors'
import Inventory   from './pages/Inventory'
import Requests    from './pages/Requests'
import Banks       from './pages/Banks'
import Donations   from './pages/Donations'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected — all share the Navbar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index                element={<Dashboard />} />
              <Route path="/donors"       element={<Donors />} />
              <Route path="/inventory"    element={<Inventory />} />
              <Route path="/requests"     element={<Requests />} />
              <Route path="/banks"        element={<Banks />} />
              <Route path="/donations"    element={<Donations />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}

import { Outlet } from 'react-router-dom'
function Layout() {
  return (
    <div className="app-shell min-h-screen bg-[#f8f6f3]">
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-7 sm:py-9">
        <Outlet />
      </main>
    </div>
  )
}
