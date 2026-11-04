import { useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'
import AuthShowcase from '../components/AuthShowcase'
import GoogleSignIn from '../components/GoogleSignIn'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [method, setMethod] = useState('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(identifier, password, method)
      navigate('/')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(async (credential) => {
    setError(null)
    setLoading(true)
    try {
      await loginWithGoogle(credential)
      navigate('/')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [loginWithGoogle, navigate])

  return (
    <div className="auth-page">
      <AuthShowcase />
      <main className="auth-main">
        <section className="auth-card login-card">
          <div className="auth-card-topline"><span className="auth-mini-mark">✚</span><span className="auth-card-note">YOUR GOOD WORK, IN ONE PLACE</span><ThemeToggle compact /></div>
          <div className="mb-6 mt-6">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#30212a]">Let’s pick up the good.</h1>
            <p className="mt-2 text-sm text-[#8d7d7d]">Sign in to your Hemora space.</p>
          </div>

          <ErrorBanner error={error} onDismiss={() => setError(null)} />

          <div className="login-methods" role="tablist" aria-label="Choose sign-in method">
            <button type="button" role="tab" aria-selected={method === 'email'} onClick={() => { setMethod('email'); setIdentifier('') }} className={method === 'email' ? 'active' : ''}>Email</button>
            <button type="button" role="tab" aria-selected={method === 'phone'} onClick={() => { setMethod('phone'); setIdentifier('') }} className={method === 'phone' ? 'active' : ''}>Mobile number</button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="login-identifier">{method === 'email' ? 'Email address' : 'Mobile number'}</label>
              <input id="login-identifier" type={method === 'email' ? 'email' : 'tel'} required autoComplete={method === 'email' ? 'email' : 'tel'} className="input" placeholder={method === 'email' ? 'you@example.com' : '+91 98100 00001'} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <input id="login-password" type="password" required autoComplete="current-password" className="input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary auth-submit mt-2 w-full justify-center py-3">{loading ? 'Signing you in…' : <>Sign in <span aria-hidden="true">↗</span></>}</button>
          </form>

          <div className="login-divider"><span>or continue with</span></div>
          <GoogleSignIn onCredential={handleGoogleCredential} />

          <p className="mt-6 text-center text-sm text-[#8d7d7d]">New to the network? <Link to="/register" className="font-bold text-[#a33243] hover:underline">Join as a donor ↗</Link></p>
        </section>
        <p className="auth-footnote">A little good, flowing through your community.</p>
      </main>
    </div>
  )
}
