/** Extracts a friendly message from an Axios error */
export function getErrorMessage(err) {
  const data = err?.response?.data
  if (!data) return err?.message || 'An unexpected error occurred.'
  if (data.errors?.length) return data.errors.join(' · ')
  return data.message || 'Something went wrong.'
}

export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  const msg = typeof error === 'string' ? error : getErrorMessage(error)
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
      <span className="text-red-500 text-lg flex-shrink-0">⚠</span>
      <p className="text-sm text-red-700 flex-1">{msg}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      )}
    </div>
  )
}
