import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f3ef] p-4">
      <div className="absolute inset-y-0 left-0 hidden w-[43%] overflow-hidden bg-[#76242d] lg:block"><div className="absolute -left-20 -top-20 h-80 w-80 rounded-full border border-white/10"/><div className="absolute -left-4 -top-4 h-48 w-48 rounded-full border border-white/10"/><div className="absolute bottom-[-110px] right-[-80px] h-96 w-96 rounded-full bg-[#9d2935]"/><div className="relative flex h-full flex-col justify-between p-14 text-white"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl">✚</span><div><p className="font-[Manrope] text-sm font-extrabold tracking-wide">HEMORA</p><p className="text-[9px] uppercase tracking-[.2em] text-white/55">Blood network</p></div></div><div className="relative max-w-md"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#eab8b7]">One community. Countless lives.</p><h2 className="mt-5 font-[Manrope] text-5xl font-extrabold leading-[1.1] tracking-tight">Good things<br/>flow together.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Connect donors, hospitals, and blood banks in one place. Because when someone needs help, every moment matters.</p><div className="mt-9 flex items-center gap-3"><div className="flex -space-x-2"><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#76242d] bg-[#e6c5b9] text-xs">♡</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#76242d] bg-[#d6b9ae] text-xs">✚</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#76242d] bg-[#f1ddd2] text-xs">+</span></div><span className="text-[11px] text-white/65">Together, we make a difference.</span></div></div><p className="text-[10px] tracking-wide text-white/35">A smarter way to give the gift of life.</p></div></div>
      <div className="w-full max-w-md rounded-3xl border border-[#eee7e0] bg-white p-7 shadow-[0_16px_55px_rgba(54,40,34,.09)] sm:p-9 lg:ml-[43%]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#f8e9e8] text-xl text-[#9d2935]">✚</div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#302927]">Sign in to Hemora</h1>
          <p className="mt-1 text-sm text-[#968b85]">Your network is ready when you are.</p>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email" required autoComplete="email"
              className="input"
              placeholder="admin@bloodbank.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password" required autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Quick login hints for demo */}
        <div className="mt-6 rounded-xl border border-[#efe8e2] bg-[#fbf9f7] p-4 text-xs text-[#766b65]">
          <p className="mb-2 font-bold text-[#504541]">Demo access <span className="font-medium text-[#a0958e]">· password: Test@1234</span></p>
          <p>Admin: <code className="text-[#9d2935]">admin@bloodbank.in</code></p><p>Donor: <code className="text-[#9d2935]">rohan.mehta@gmail.com</code></p><p>Hospital: <code className="text-[#9d2935]">sunita.kapoor@aiims.in</code></p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          New donor?{' '}
          <Link to="/register" className="text-red-600 font-medium hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  )
}
