// TODO(sentry-validation): TEMPORARY — remove this file and its route in App.tsx
// after confirming Sentry receives events in the dashboard.
// Route: /sentry-test  (only useful when VITE_SENTRY_DSN is set)

import { useState } from 'react'
import * as Sentry from '@sentry/react'

// Extract project ID from DSN: https://<key>@<host>/<projectId>
// Shown in the UI so you can compare against the Sentry URL:
// sentry.io/issues/?project=<projectId>
function parseDsnProjectId(dsn: string): string {
  try {
    return new URL(dsn).pathname.replace(/\//g, '') || '(unknown)'
  } catch {
    return '(invalid DSN format)'
  }
}

export default function SentryTestPage() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  const projectId = dsn ? parseDsnProjectId(dsn) : null
  const [log, setLog] = useState<string[]>([])

  function addLog(msg: string) {
    setLog((prev) => [`${new Date().toISOString().slice(11, 23)} ${msg}`, ...prev])
  }

  async function handleCaptureMessage() {
    if (!dsn) {
      addLog('❌ VITE_SENTRY_DSN is not set — Sentry is inactive.')
      return
    }
    addLog('→ Calling Sentry.captureMessage()…')
    Sentry.captureMessage('Frontend Sentry test', 'info')
    addLog('→ Calling Sentry.flush(2000)…')
    const flushed = await Sentry.flush(2000)
    addLog(flushed ? '✅ flush() completed — event delivered.' : '⚠️ flush() timed out — event may not have sent.')
    addLog(`   Check Sentry project ${projectId} for "Frontend Sentry test"`)
  }

  async function handleThrowError() {
    if (!dsn) {
      addLog('❌ VITE_SENTRY_DSN is not set — Sentry is inactive.')
      return
    }
    addLog('→ Throwing Error("Frontend Sentry test error")…')
    // Small delay so the log line renders before the throw
    await new Promise((r) => setTimeout(r, 50))
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
      fontFamily: 'monospace',
      background: '#09090b',
      color: '#fafafa',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'sans-serif' }}>
        🔍 Sentry Validation (TEMPORARY)
      </h1>

      {/* ── Diagnostic panel ── */}
      <div style={panelStyle}>
        <Row label="DSN configured" value={dsn ? '✅ yes' : '❌ no — set VITE_SENTRY_DSN in Vercel'} ok={!!dsn} />
        <Row
          label="Sentry project ID (from DSN)"
          value={projectId ?? '—'}
          ok={!!projectId}
          hint='Compare to the ?project= number in your Sentry dashboard URL'
        />
        <Row
          label="Expected Sentry project URL"
          value={projectId ? `sentry.io/issues/?project=${projectId}` : '—'}
          ok={!!projectId}
        />
        <Row label="Build environment" value={import.meta.env.MODE} ok />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button id="sentry-test-message-btn" onClick={handleCaptureMessage} style={btnStyle('#2563eb')}>
          Send captureMessage
        </button>
        <button id="sentry-test-error-btn" onClick={handleThrowError} style={btnStyle('#dc2626')}>
          Throw Error
        </button>
        <button onClick={() => setLog([])} style={btnStyle('#3f3f46')}>
          Clear log
        </button>
      </div>

      {/* ── Event log ── */}
      {log.length > 0 && (
        <div style={{
          background: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          width: '100%',
          maxWidth: 560,
          fontSize: '0.75rem',
          lineHeight: 1.8,
          color: '#a1a1aa',
        }}>
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      <p style={{ fontSize: '0.7rem', color: '#3f3f46', marginTop: '1rem' }}>
        TODO(sentry-validation): Remove /sentry-test route after validation.
      </p>
    </div>
  )
}

function Row({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0.35rem 0', borderBottom: '1px solid #27272a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <span style={{ color: '#71717a', fontSize: '0.72rem' }}>{label}</span>
        <span style={{ color: ok ? '#4ade80' : '#f87171', fontSize: '0.72rem', textAlign: 'right' }}>{value}</span>
      </div>
      {hint && <span style={{ color: '#52525b', fontSize: '0.65rem' }}>{hint}</span>}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  width: '100%',
  maxWidth: 560,
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '0.6rem 1.5rem',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'sans-serif',
  }
}
