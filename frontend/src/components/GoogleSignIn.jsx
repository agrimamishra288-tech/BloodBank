import { useEffect, useState } from 'react'
import { getRedirectResult, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from '../firebase'

let redirectResultPromise
const REDIRECT_FLAG = 'hemora.googleRedirect'

const ERROR_MESSAGES = {
  'auth/unauthorized-domain': 'Add this site host (localhost or your LAN address) to Firebase Authentication’s authorized domains.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled in the Firebase project yet.',
  'auth/network-request-failed': 'The browser could not reach Google. Check your internet connection.',
  'auth/web-storage-unsupported': 'This browser blocks the storage Google sign-in needs. Allow cookies for this site and try again.',
  'auth/third-party-cookie-blocked': 'This browser blocks third-party cookies. Allow cookies for this site, or disable incognito mode, then try again.',
}

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
        if (!active) return
        const wasRedirecting = sessionStorage.getItem(REDIRECT_FLAG) === '1'
        sessionStorage.removeItem(REDIRECT_FLAG)
        if (!result) {
          // A null result after leaving for Google means the browser dropped
          // the sign-in state (usually blocked third-party cookies) instead of
          // failing loudly. Say so rather than silently returning to login.
          if (wasRedirecting) {
            onError?.(new Error('Google returned without a credential. Allow cookies for this site (or leave private/incognito mode) and try again.'))
          }
          return
        }
        await onCredential(await result.user.getIdToken())
      })
      .catch((error) => {
        if (!active) return
        onError?.(new Error(ERROR_MESSAGES[error?.code] || error?.message || 'Google sign-in failed.'))
      })

    return () => { active = false }
  }, [])

  async function handleClick() {
    setLoading(true)
    const provider = new GoogleAuthProvider()
    // Show Google's account chooser. If the browser already has the account
    // signed in, the user can select it without re-entering their password.
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      // Popup is the reliable flow in browsers that block third-party cookies;
      // it hands the credential straight back to this page without a reload.
      const result = await signInWithPopup(firebaseAuth, provider)
      await onCredential(await result.user.getIdToken())
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        return
      }
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
        // Embedded or locked-down browsers can refuse popups; fall back to the
        // full-page redirect flow and remember that we left for Google.
        try {
          sessionStorage.setItem(REDIRECT_FLAG, '1')
          await signInWithRedirect(firebaseAuth, provider)
          return
        } catch (redirectError) {
          sessionStorage.removeItem(REDIRECT_FLAG)
          onError?.(new Error(ERROR_MESSAGES[redirectError?.code] || redirectError?.message || 'Google sign-in failed.'))
          return
        }
      }
      onError?.(new Error(ERROR_MESSAGES[error?.code] || error?.message || 'Google sign-in failed.'))
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
