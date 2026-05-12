// TODO(sentry-validation): TEMPORARY — remove this file and its route in App.tsx
// after confirming Sentry receives events in the dashboard.
// Route: /sentry-test  (only useful when VITE_SENTRY_DSN is set)

import * as Sentry from '@sentry/react'

export default function SentryTestPage() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

  async function handleCaptureMessage() {
    if (!dsn) {
      alert('VITE_SENTRY_DSN is not set — Sentry is inactive.')
      return
    }
    Sentry.captureMessage('Frontend Sentry test', 'info')
    // flush() guarantees the event is delivered before the alert fires.
    await Sentry.flush(2000)
    alert('✅ Sentry.captureMessage() sent and flushed. Check your Sentry dashboard (Issues → "Frontend Sentry test").')
  }

  function handleThrowError() {
    if (!dsn) {
      alert('VITE_SENTRY_DSN is not set — Sentry is inactive.')
      return
    }
    // Throwing from a click handler — Sentry's global error handler catches it.
    throw new Error('Frontend Sentry test error')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      fontFamily: 'sans-serif',
      background: '#09090b',
      color: '#fafafa',
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🔍 Sentry Validation (TEMPORARY)</h1>

      <p style={{ fontSize: '0.875rem', color: '#a1a1aa', maxWidth: 400, textAlign: 'center' }}>
        DSN status:{' '}
        <code style={{ color: dsn ? '#4ade80' : '#f87171' }}>
          {dsn ? 'configured ✅' : 'not set ❌'}
        </code>
      </p>

      <button
        id="sentry-test-message-btn"
        onClick={handleCaptureMessage}
        style={btnStyle('#2563eb')}
      >
        Send captureMessage (no error)
      </button>

      <button
        id="sentry-test-error-btn"
        onClick={handleThrowError}
        style={btnStyle('#dc2626')}
      >
        Throw Error (triggers error event)
      </button>

      <p style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '2rem' }}>
        TODO(sentry-validation): Remove /sentry-test route after validation.
      </p>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '0.75rem 2rem',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: 600,
  }
}
