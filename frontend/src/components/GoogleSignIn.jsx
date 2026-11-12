import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from '../firebase'

export default function GoogleSignIn({ onCredential, onError }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
      const idToken = await result.user.getIdToken()
      await onCredential(idToken)
    } catch (error) {
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  if (!firebaseConfigured) {
    return (
      <div className="google-setup">
        <button type="button" className="google-placeholder" disabled>
          <span className="google-mark" aria-hidden="true">G</span>Continue with Google
        </button>
        <p>Connect a Firebase web app to enable Google sign-in. Setup steps are in the backend README.</p>
      </div>
    )
  }

  return (
    <button type="button" className="google-placeholder google-firebase-button" onClick={handleClick} disabled={loading}>
      <span className="google-mark" aria-hidden="true">G</span>{loading ? 'Connecting to Google…' : 'Continue with Google'}
    </button>
  )
}
