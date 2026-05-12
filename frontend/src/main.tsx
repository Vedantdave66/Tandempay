import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'

// ── Sentry error monitoring ──────────────────────────────────────────────────
// Only active when VITE_SENTRY_DSN is set in the build environment.
// Leave the variable empty (or unset) for local dev — no DSN, no Sentry.
const _SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (_SENTRY_DSN) {
  const FORBIDDEN = ['password', 'token', 'secret']

  Sentry.init({
    dsn: _SENTRY_DSN,
    tracesSampleRate: 0.1,                  // 10% of transactions
    environment: import.meta.env.MODE,      // 'development' | 'production'
    beforeSend(event) {
      // Drop events that accidentally contain sensitive data
      const text = JSON.stringify(event).toLowerCase()
      if (FORBIDDEN.some((term) => text.includes(term))) return null
      return event
    },
    // Replay is intentionally NOT enabled — privacy-invasive
  })
}

const rootEl = document.getElementById('root')!

createRoot(rootEl).render(
  <StrictMode>
    {_SENTRY_DSN ? (
      // ErrorBoundary catches React render-phase crashes when Sentry is active
      <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh.</p>}>
        <App />
      </Sentry.ErrorBoundary>
    ) : (
      <App />
    )}
  </StrictMode>,
)

