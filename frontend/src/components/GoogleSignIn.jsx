import { useEffect, useState } from 'react'
import { getRedirectResult, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from '../firebase'

let redirectResultPromise

export default function GoogleSignIn({ onCredential, onError }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured) return undefined

    let active = true
    // Cache the promise so React StrictMode does not consume the redirect
    // result twice during its development-only effect replay.
    redirectResultPromise ||= getRedirectResult(firebaseAuth)
    redirectResultPromise
      .then(async (result) => {
        if (!active || !result) return
        await onCredential(await result.user.getIdToken())
      })
      .catch((error) => {
        if (!active) return
        const messages = {
          'auth/unauthorized-domain': 'Add this site host (localhost or your LAN address) to Firebase Authentication’s authorized domains.',
          'auth/operation-not-allowed': 'Google sign-in is not enabled in the Firebase project yet.',
        }
        onError?.(new Error(messages[error?.code] || error?.message || 'Google sign-in failed.'))
      })

    return () => { active = false }
  }, [])

  async function handleClick() {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      // Show Google's account chooser. If the browser already has the account
      // signed in, the user can select it without re-entering their password.
      provider.setCustomParameters({ prompt: 'select_account' })
      // Full-page redirect works in embedded browsers that block OAuth popups.
      await signInWithRedirect(firebaseAuth, provider)
    } catch (error) {
      const messages = {
        'auth/operation-not-allowed': 'Google sign-in is not enabled in the Firebase project yet.',
        'auth/unauthorized-domain': 'Add this site host (localhost or your LAN address) to Firebase Authentication’s authorized domains.',
        'auth/network-request-failed': 'The browser could not reach Firebase. Check your internet connection.',
      }
      onError?.(new Error(messages[error?.code] || error?.message || 'Google sign-in failed.'))
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
