import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, UserRound, Building2, Mail, Phone, LockKeyhole, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthFrame from '../components/AuthFrame'
import MfaVerification from '../components/MfaVerification'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function Register() {
  const { register, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', role:'donor', blood_group:'O+', age:'', gender:'M', city:'', state:'', address:'' })
  const [challenge, setChallenge] = useState(null)
  const [busy, setBusy] = useState(false)
  function set(key, value) { setForm(current => ({ ...current, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault(); setBusy(true)
    try {
      const result = await register({ ...form, age: form.age ? Number(form.age) : undefined })
      if (result.mfaRequired) setChallenge(result)
      else { toast.success('Account created. Please sign in.'); navigate('/login') }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.errors?.join(', ') || 'Could not create your account')
    } finally { setBusy(false) }
  }

  async function handleVerify(code) {
    setBusy(true)
    try { await verifyMfa(challenge.challengeToken, code); toast.success('Your Hemora account is ready'); navigate('/') }
    catch (error) { toast.error(error?.response?.data?.message || 'That code did not match. Try again.') }
    finally { setBusy(false) }
  }

  return <AuthFrame mode="register">
    {challenge ? <MfaVerification challenge={challenge} busy={busy} onVerify={handleVerify} onBack={() => setChallenge(null)}/> : <>
      <header className="auth-form-heading register-heading"><span className="form-eyebrow">JOIN THE COMMUNITY</span><h2>There’s room for you.</h2><p>Tell us how you’d like to be part of the network.</p></header>
      <form onSubmit={handleSubmit} className="auth-form register-form">
        <div className="role-options" aria-label="Account type"><button type="button" className={form.role === 'donor' ? 'selected' : ''} onClick={() => set('role','donor')}><UserRound size={17}/><span><b>Donor</b><small>Give when you can</small></span></button><button type="button" className={form.role === 'hospital' ? 'selected' : ''} onClick={() => set('role','hospital')}><Building2 size={17}/><span><b>Hospital team</b><small>Request and coordinate</small></span></button></div>
        <div className="register-grid">
          <label className="auth-input-label"><span>FULL NAME</span><div className="auth-input-wrap"><UserRound size={15}/><input required minLength={2} autoComplete="name" placeholder="Your name" value={form.name} onChange={e => set('name',e.target.value)}/></div></label>
          <label className="auth-input-label"><span>PHONE NUMBER <small>OPTIONAL</small></span><div className="auth-input-wrap"><Phone size={15}/><input type="tel" autoComplete="tel" placeholder="+91 98100 00001" value={form.phone} onChange={e => set('phone',e.target.value)}/></div></label>
          <label className="auth-input-label"><span>EMAIL ADDRESS</span><div className="auth-input-wrap"><Mail size={15}/><input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => set('email',e.target.value)}/></div></label>
          <label className="auth-input-label"><span>PASSWORD</span><div className="auth-input-wrap"><LockKeyhole size={15}/><input required minLength={6} type="password" autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={e => set('password',e.target.value)}/></div></label>
          {form.role === 'donor' && <>
            <label className="auth-input-label"><span>BLOOD GROUP</span><select required value={form.blood_group} onChange={e => set('blood_group',e.target.value)}>{BLOOD_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label>
            <label className="auth-input-label"><span>AGE <small>18–65</small></span><input required type="number" min="18" max="65" placeholder="Your age" value={form.age} onChange={e => set('age',e.target.value)}/></label>
            <label className="auth-input-label"><span>GENDER</span><select required value={form.gender} onChange={e => set('gender',e.target.value)}><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></label>
            <label className="auth-input-label"><span>CITY</span><div className="auth-input-wrap"><MapPin size={15}/><input required autoComplete="address-level2" placeholder="Your city" value={form.city} onChange={e => set('city',e.target.value)}/></div></label>
            <label className="auth-input-label register-wide"><span>STATE</span><input required autoComplete="address-level1" placeholder="Your state" value={form.state} onChange={e => set('state',e.target.value)}/></label>
          </>}
        </div>
        <button type="submit" disabled={busy} className="auth-submit">{busy ? 'Creating your account…' : <>Create account <ArrowRight size={16}/></>}</button>
      </form>
      <p className="auth-switch">Already part of Hemora? <Link to="/login">Sign in <ArrowRight size={14}/></Link></p>
    </>}
  </AuthFrame>
}
