import { useEffect, useRef } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleSignIn({ onCredential }) {
  const buttonRef = useRef(null)
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return undefined

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => callbackRef.current(response.credential),
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: buttonRef.current.clientWidth || 360,
      })
    }

    let script = document.querySelector('script[data-hemora-google]')
    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else if (script) {
      script.addEventListener('load', renderGoogleButton)
    } else {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.hemoraGoogle = 'true'
      script.addEventListener('load', renderGoogleButton)
      document.head.appendChild(script)
    }

    return () => script?.removeEventListener('load', renderGoogleButton)
  }, [])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="google-setup">
        <button type="button" className="google-placeholder" disabled>
          <span className="google-mark" aria-hidden="true">G</span>Continue with Google
        </button>
        <p>Google sign-in needs an OAuth client ID to be configured.</p>
      </div>
    )
  }

  return <div className="google-button" ref={buttonRef} aria-label="Continue with Google" />
}
