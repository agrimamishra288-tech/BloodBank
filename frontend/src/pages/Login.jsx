import { useCallback, useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'
import AuthShowcase from '../components/AuthShowcase'
import GoogleSignIn from '../components/GoogleSignIn'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const { login, loginWithGoogle, completeMfa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [method, setMethod] = useState('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [challenge, setChallenge] = useState(() => location.state?.authChallenge || null)
  const [code, setCode] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(identifier, password, method)
      setChallenge(result)
      setCode('')
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
      const result = await loginWithGoogle(credential)
      setChallenge(result)
      setCode('')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [loginWithGoogle, navigate])

  async function handleVerify(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await completeMfa(challenge.challengeToken, code)
      navigate('/', { replace: true })
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
        <section className="auth-card login-card">
          <div className="auth-card-topline"><span className="auth-mini-mark">✚</span><span className="auth-card-note">YOUR GOOD WORK, IN ONE PLACE</span><ThemeToggle compact /></div>
          <div className="mb-6 mt-6">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#30212a]">Let’s pick up the good.</h1>
            <p className="mt-2 text-sm text-[#8d7d7d]">Sign in to your Hemora space.</p>
          </div>

          <ErrorBanner error={error} onDismiss={() => setError(null)} />

          {challenge ? (
            <div className="mfa-panel">
              <p className="eyebrow">Two-step verification</p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#30212a]">
                {challenge.setupRequired ? 'Set up your authenticator' : 'Enter your security code'}
              </h2>
              {challenge.setupRequired ? (
                <div className="mfa-instructions">
                  <p>Open Google Authenticator, Microsoft Authenticator, or another authenticator app. Add an account using this setup key:</p>
                  <code className="mfa-secret">{challenge.setupSecret}</code>
                  <p className="mfa-small">Choose time-based code (TOTP). Your app will make a new six-digit code every 30 seconds. Save this key somewhere private.</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#8d7d7d]">Enter the current six-digit code from your authenticator app.</p>
              )}
              <form onSubmit={handleVerify} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="mfa-code">Authenticator code</label>
                  <input id="mfa-code" className="input mfa-code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                </div>
                <button type="submit" disabled={loading || code.length !== 6} className="btn-primary auth-submit w-full justify-center py-3">{loading ? 'Verifying…' : challenge.setupRequired ? 'Enable two-step sign-in' : 'Verify and sign in'}</button>
              </form>
              <button type="button" className="mfa-back" onClick={() => { setChallenge(null); setCode(''); setError(null); navigate('/login', { replace: true, state: {} }) }}>Back to sign in</button>
            </div>
          ) : <>

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
          </>}

          {!challenge && <p className="mt-6 text-center text-sm text-[#8d7d7d]">New to the network? <Link to="/register" className="font-bold text-[#a33243] hover:underline">Join as a donor ↗</Link></p>}
        </section>
        <p className="auth-footnote">A little good, flowing through your community.</p>
      </main>
    </div>
  )
}
