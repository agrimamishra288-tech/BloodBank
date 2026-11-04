import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'
import AuthShowcase from '../components/AuthShowcase'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <AuthShowcase />
      <main className="auth-main">
        <section className="auth-card">
          <div className="auth-card-topline"><span className="auth-mini-mark">✚</span><span className="auth-card-note">YOUR GOOD WORK, IN ONE PLACE</span></div>
          <div className="mb-7 mt-6">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#30212a]">Let’s pick up the good.</h1>
            <p className="mt-2 text-sm text-[#8d7d7d]">Sign in to your Hemora space.</p>
          </div>

          <ErrorBanner error={error} onDismiss={() => setError(null)} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" required autoComplete="email" className="input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between"><label className="label">Password</label><span className="text-[10px] font-semibold text-[#b0817b]">Good to have you back</span></div>
              <input type="password" required autoComplete="current-password" className="input" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary auth-submit mt-2 w-full justify-center py-3">{loading ? 'Signing you in…' : <>Sign in <span aria-hidden="true">↗</span></>}</button>
          </form>

          <div className="demo-box mt-6">
            <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ffeadb] text-xs text-[#a13c4b]">✦</span><p className="font-bold text-[#55424a]">Take a quick look around</p></div>
            <p className="mt-2 text-[11px] text-[#8d7d7d]">Demo password: <code className="font-bold text-[#9d2935]">Test@1234</code></p>
            <div className="mt-2 grid gap-1 text-[11px] text-[#7b6d6d]"><p>Admin <code className="text-[#9d2935]">admin@bloodbank.in</code></p><p>Donor <code className="text-[#9d2935]">rohan.mehta@gmail.com</code></p><p>Hospital <code className="text-[#9d2935]">sunita.kapoor@aiims.in</code></p></div>
          </div>

          <p className="mt-6 text-center text-sm text-[#8d7d7d]">New to the network? <Link to="/register" className="font-bold text-[#a33243] hover:underline">Join as a donor ↗</Link></p>
        </section>
        <p className="auth-footnote">A little good, flowing through your community.</p>
      </main>
    </div>
  )
}
