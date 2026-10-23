/**
 * Theme handling. Three modes:
 *  - 'light'  -> the Gnos3 light theme
 *  - 'dark'   -> the Gnos3 navy dark theme
 *  - 'system' -> follow the OS `prefers-color-scheme` (the default)
 *
 * The resolved theme is written to `data-theme` on <html>; index.css defines
 * the Gnos3 tokens for `:root` (light) and `[data-theme='dark']`. The user's
 * own choice persists in localStorage under `ledger-sync-theme`.
 *
 * Inside Gnos3 the theme is Gnos3's: the one it passed at sign-in or sent
 * since (lib/gnos3Embed.ts, sessionStorage `gnos3-theme`) wins, and the OS
 * decides when it sent none. public/theme-init.js applies the same rules
 * before first paint (no flash); this module keeps it in sync at runtime.
 */

import { refreshRawColors } from '@/constants/colors'
import { getGnos3Theme, insideGnos3, setGnos3Theme } from '@/lib/gnos3Embed'

export type ThemeMode = 'dark' | 'light' | 'system'

export const THEME_STORAGE_KEY = 'ledger-sync-theme'

/** The mode to start in: Gnos3's theme for this session, else the user's stored choice, else 'system'. */
export function getStoredThemeMode(): ThemeMode {
  const gnos3Theme = getGnos3Theme()
  if (gnos3Theme) return gnos3Theme
  if (insideGnos3()) return 'system'
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v === 'dark' || v === 'light' || v === 'system') return v
  } catch {
    // localStorage may be unavailable (private mode / quota) -- fall through.
  }
  return 'system'
}

/** Resolve a mode to the concrete theme to paint ('dark' | 'light'). */
export function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    const prefersDark =
      globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    return prefersDark ? 'dark' : 'light'
  }
  return mode
}

// Tracks the pending removal of the `theme-transition` class so rapid toggles
// don't leave it on (or fight each other).
let transitionTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Apply a resolved theme to the document root.
 *
 * When the theme actually CHANGES, add a short-lived `theme-transition` class
 * that gives every element one uniform color/background/border transition, so
 * the whole UI cross-fades in sync instead of different parts (cards, body,
 * borders) easing at their own speeds. The class is removed after the window
 * so normal hover/focus transitions keep their own (faster) timings.
 *
 * `skipTransition` (used for the very first apply on load) avoids animating the
 * initial paint.
 */
export function applyTheme(resolved: 'dark' | 'light', skipTransition = false): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const changed = root.getAttribute('data-theme') !== resolved

  if (changed && !skipTransition) {
    root.classList.add('theme-transition')
    if (transitionTimer) clearTimeout(transitionTimer)
    transitionTimer = setTimeout(() => {
      root.classList.remove('theme-transition')
    }, 400)
  }

  root.setAttribute('data-theme', resolved)

  // Keep the mobile browser chrome (theme-color / color-scheme) tracking the
  // active theme on a live toggle, mirroring the pre-paint script in index.html.
  const bar = resolved === 'light' ? '#ffffff' : '#0A1019' // --background
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar)
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', resolved)

  // Re-resolve the chart color tokens (Recharts/SVG read concrete values, not
  // var()) so charts repaint with the active theme's palette. Runs after the
  // data-theme switch so getComputedStyle sees the new token values.
  refreshRawColors()
}

/**
 * The user's own choice (theme switch, Settings > Display; never shown inside Gnos3):
 * persist the mode and apply it immediately. It replaces any theme Gnos3 passed this
 * session. Returns the resolved theme.
 */
export function setThemeMode(mode: ThemeMode): 'dark' | 'light' {
  setGnos3Theme(null)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // ignore persistence failure; still apply for this session
  }
  const resolved = resolveTheme(mode)
  applyTheme(resolved)
  return resolved
}
