import { useState } from 'react'
import { KeyRound, ShieldCheck, ArrowRight } from 'lucide-react'

export default function MfaVerification({ challenge, onVerify, onBack, busy = false }) {
  const [code, setCode] = useState('')
  return <div className="mfa-card">
    <span className="form-eyebrow">ONE LAST STEP</span><div className="mfa-icon"><ShieldCheck size={20}/></div>
    <h2>{challenge.setupRequired ? 'Set up your sign-in.' : 'Verify it’s you.'}</h2>
    <p>{challenge.setupRequired ? 'Add Hemora to an authenticator app, then enter the six-digit code it gives you.' : 'Enter the current six-digit code from your authenticator app.'}</p>
    {challenge.setupRequired && <p style={{ marginTop: 8 }}>This step is for password sign-in. Google sign-in does not ask for a code.</p>}
    {challenge.setupRequired && <div className="mfa-secret"><span><KeyRound size={14}/> SETUP KEY</span><code>{challenge.setupSecret}</code><small>In your authenticator app, choose “enter setup key”. Keep this key private.</small></div>}
    <form onSubmit={e => { e.preventDefault(); onVerify(code) }} className="mfa-form">
      <label className="login-field"><span>AUTHENTICATOR CODE</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-label="Six-digit authenticator code" placeholder="000 000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0,6))}/></label>
      <button className="login-submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : <>Verify and continue <ArrowRight size={16}/></>}</button>
    </form>
    <button type="button" className="mfa-back" onClick={onBack}>Back to sign in</button>
  </div>
}
