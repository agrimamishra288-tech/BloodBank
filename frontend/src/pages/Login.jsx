import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Mail, Phone, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import AuthFrame from '../components/AuthFrame'
import MfaVerification from '../components/MfaVerification'
import GoogleSignIn from '../components/GoogleSignIn'

export default function Login() {
  const { login, verifyMfa, completeSignIn } = useAuth()
  const navigate = useNavigate()
  const [method, setMethod] = useState('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [challenge, setChallenge] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await login(method === 'email' ? { email: identifier, password } : { phone: identifier, password })
      if (result.mfaRequired) { setChallenge(result.challenge); return }
      toast.success('Welcome back')
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not sign in')
    } finally { setBusy(false) }
  }

  async function handleGoogleCredential(idToken) {
    setBusy(true)
    try {
      const { data } = await api.post('/auth/firebase', { idToken })
      if (data.mfaRequired) setChallenge(data)
      else { completeSignIn(data); navigate('/') }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Google sign-in could not be completed')
    } finally { setBusy(false) }
  }

  async function handleVerify(code) {
    setBusy(true)
    try { await verifyMfa(challenge.challengeToken, code); toast.success('You’re signed in'); navigate('/') }
    catch (error) { toast.error(error?.response?.data?.message || 'That code did not match. Try again.') }
    finally { setBusy(false) }
  }

  return <AuthFrame mode="login">
    {challenge ? <MfaVerification challenge={challenge} busy={busy} onVerify={handleVerify} onBack={() => setChallenge(null)}/> : <>
      <header className="auth-form-heading"><span className="form-eyebrow">WELCOME BACK</span><h2>Good to see you.</h2><p>Sign in and pick up where care needs you.</p></header>
      <div className="auth-methods" role="tablist" aria-label="Sign-in method"><button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'selected' : ''} onClick={() => { setMethod('email'); setIdentifier('') }}><Mail size={15}/> Email</button><button type="button" role="tab" aria-selected={method === 'phone'} className={method === 'phone' ? 'selected' : ''} onClick={() => { setMethod('phone'); setIdentifier('') }}><Phone size={15}/> Phone</button></div>
      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-input-label"><span>{method === 'email' ? 'EMAIL ADDRESS' : 'MOBILE NUMBER'}</span><div className="auth-input-wrap">{method === 'email' ? <Mail size={16}/> : <Phone size={16}/>}<input type={method === 'email' ? 'email' : 'tel'} inputMode={method === 'email' ? 'email' : 'tel'} required autoComplete={method === 'email' ? 'email' : 'tel'} placeholder={method === 'email' ? 'you@example.com' : '+91 98100 00001'} value={identifier} onChange={e => setIdentifier(e.target.value)}/></div></label>
        <label className="auth-input-label"><span>PASSWORD</span><div className="auth-input-wrap"><ShieldCheck size={16}/><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)}/><button type="button" className="password-eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
        <button type="submit" disabled={busy} className="auth-submit">{busy ? 'Connecting…' : <>Sign in <ArrowRight size={16}/></>}</button>
      </form>
      <div className="auth-separator"><span>OR SIGN IN WITH</span></div>
      <GoogleSignIn onCredential={handleGoogleCredential} onError={error => toast.error(error.message || 'Google sign-in failed')}/>
      <p className="auth-switch">New to Hemora? <Link to="/register">Create your account <ArrowRight size={14}/></Link></p>
      <div className="auth-assurance"><ShieldCheck size={14}/><span>Two-step verification helps keep your account safe.</span></div>
    </>}
  </AuthFrame>
}
