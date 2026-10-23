import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { API_BASE_URL } from '@/constants'
import { applyGnos3Locale, fetchGnos3Origins, listenForGnos3Theme } from '@/lib/gnos3Embed'
import { useThemeStore } from '@/store/themeStore'

// Inside the Gnos3 frame: keep the locale Gnos3 passed at sign-in, and follow the theme it
// posts whenever the user changes it (only from the origins in LEDGER_SYNC_FRAME_ANCESTORS).
applyGnos3Locale()
listenForGnos3Theme(
  (theme) => useThemeStore.getState().applyGnos3Theme(theme),
  () => fetchGnos3Origins(API_BASE_URL),
)

// ── Suppress known harmless third-party console warnings (production only) ───
// These are noise from upstream libraries that cannot be fixed on our side.
// - Recharts: Negative dimension during initial responsive layout pass
// - Framer Motion: Reduced motion accessibility notification
if (import.meta.env.PROD) {
  const SUPPRESSED_PATTERNS = [
    'should be greater than 0',  // Recharts ResponsiveContainer
    'Reduced Motion',            // Framer Motion a11y
  ]
  const _origWarn = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (SUPPRESSED_PATTERNS.some((p) => msg.includes(p))) return
    _origWarn(...args)
  }
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  console.error(
    '[ledger-sync] Could not find #root element. The application cannot mount.'
  )
}
