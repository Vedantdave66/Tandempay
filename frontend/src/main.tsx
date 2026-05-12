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
  // Forbidden terms are checked against exception *values* and *messages* only.
  // Do NOT JSON.stringify(event) — the full event includes React Router state,
  // module paths, and Stripe objects that all contain the word 'token', which
  // would silently drop every single event (the original bug).
  const FORBIDDEN = ['password', 'hashed_password', 'stripe_payment_intent', 'interac']

  Sentry.init({
    dsn: _SENTRY_DSN,
    tracesSampleRate: 0.1,              // 10% of transactions
    environment: import.meta.env.MODE, // 'development' | 'production'
    integrations: [
      Sentry.browserTracingIntegration(), // required in @sentry/react v8+
    ],
    beforeSend(event) {
      // Check exception values only — never the full serialised event
      const exceptions = event.exception?.values ?? []
      for (const ex of exceptions) {
        const val = (ex.value ?? '').toLowerCase()
        if (FORBIDDEN.some((t) => val.includes(t))) return null
      }
      // Check log message (captureMessage events)
      const msg = (event.message ?? '').toLowerCase()
      if (FORBIDDEN.some((t) => msg.includes(t))) return null
      return event
    },
    // Replay is intentionally NOT enabled — privacy-invasive
  })
  console.log('[Sentry] Frontend monitoring enabled (env:', import.meta.env.MODE, ')')
} else {
  console.log('[Sentry] Frontend monitoring disabled — VITE_SENTRY_DSN not set.')
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

