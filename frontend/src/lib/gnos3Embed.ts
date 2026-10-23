/**
 * Finances inside Gnos3: the embedding contract.
 *
 * Gnos3 shows Finances in an iframe (FinancesEmbed.svelte). It opens
 *   /sso?gnos3_token=<jwt>&theme=light|dark&lang=<locale>
 * and then posts `{type: 'gnos3:theme', theme: 'light' | 'dark'}` to the frame whenever the
 * user's Gnos3 theme changes. Inside the frame Gnos3 owns identity and theme, so Finances shows
 * no logo, product name, theme switch or sign-out (Gnos3 design guide, "Inside the Gnos3 frame").
 *
 * "Inside Gnos3" = this document is framed AND this frame's session entered through the Gnos3
 * sign-in URL. The flag, the theme and the locale live in sessionStorage, which belongs to the
 * frame, so a reload inside the frame keeps them and a tab opened on its own does not.
 *
 * public/theme-init.js applies the same keys before first paint: keep the two in step.
 */

export type Gnos3Theme = 'light' | 'dark'

export const GNOS3_EMBED_KEY = 'gnos3-embed'
export const GNOS3_THEME_KEY = 'gnos3-theme'
export const GNOS3_LANG_KEY = 'gnos3-lang'
export const GNOS3_THEME_MESSAGE = 'gnos3:theme'

/** Public endpoint listing the Gnos3 origins allowed to frame the app (LEDGER_SYNC_FRAME_ANCESTORS). */
export const GNOS3_EMBED_CONFIG_PATH = '/api/auth/gnos3/embed'

// BCP 47-shaped tags as Gnos3 sends them: en-US, zh-CN, zh-TW, fr-FR...
const LOCALE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

function session(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

function readSession(key: string): string | null {
  try {
    return session()?.getItem(key) ?? null
  } catch {
    return null
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    const store = session()
    if (!store) return
    if (value === null) store.removeItem(key)
    else store.setItem(key, value)
  } catch {
    // storage blocked: the current page still applies the value
  }
}

export function isGnos3Theme(value: unknown): value is Gnos3Theme {
  return value === 'light' || value === 'dark'
}

/** True when this document is shown in a frame. A cross-origin top that throws counts as framed. */
export function isFramed(): boolean {
  try {
    return globalThis.self !== globalThis.top
  } catch {
    return true
  }
}

/**
 * Record the Gnos3 sign-in entry (`/sso?gnos3_token=...&theme=...&lang=...`) for this session.
 * Runs once when this module loads, before the app renders; theme-init.js has usually done the
 * same already. Without a gnos3_token the URL is not a Gnos3 entry and nothing is stored.
 */
export function captureGnos3Entry(search: string = globalThis.location?.search ?? ''): void {
  const params = new URLSearchParams(search)
  if (!params.has('gnos3_token')) return
  if (isFramed()) writeSession(GNOS3_EMBED_KEY, '1')
  const theme = params.get('theme')
  if (isGnos3Theme(theme)) writeSession(GNOS3_THEME_KEY, theme)
  const lang = params.get('lang')
  if (lang && LOCALE_RE.test(lang)) writeSession(GNOS3_LANG_KEY, lang)
}

/** Finances is running inside the Gnos3 frame: hide brand, theme switch and sign-out. */
export function insideGnos3(): boolean {
  return isFramed() && readSession(GNOS3_EMBED_KEY) === '1'
}

/** The theme Gnos3 asked for in this session, if any. */
export function getGnos3Theme(): Gnos3Theme | null {
  const value = readSession(GNOS3_THEME_KEY)
  return isGnos3Theme(value) ? value : null
}

/** Store (or, with null, forget) the session's Gnos3 theme. */
export function setGnos3Theme(theme: Gnos3Theme | null): void {
  writeSession(GNOS3_THEME_KEY, theme)
}

/**
 * The locale Gnos3 passed at sign-in (en-US, zh-CN, zh-TW, fr-FR...). Finances has no
 * translations yet, so the UI stays English: the locale is only stored and exposed as
 * `data-locale` on <html>, where index.css uses it to pick Traditional vs Simplified
 * Chinese fonts for user data. `<html lang>` stays "en" because the text is English.
 */
export function getGnos3Locale(): string | null {
  const value = readSession(GNOS3_LANG_KEY)
  return value && LOCALE_RE.test(value) ? value : null
}

export function applyGnos3Locale(): void {
  const locale = getGnos3Locale()
  if (locale && typeof document !== 'undefined') {
    document.documentElement.dataset.locale = locale
  }
}

/** Origin of each entry of a frame-ancestors style list; CSP keywords, wildcards and junk are dropped. */
export function toOrigins(entries: readonly unknown[]): string[] {
  const origins = new Set<string>()
  for (const entry of entries) {
    if (typeof entry !== 'string' || entry.includes('*')) continue
    try {
      const url = new URL(entry)
      if (url.protocol === 'http:' || url.protocol === 'https:') origins.add(url.origin)
    } catch {
      // not a URL ('self', 'none', a bare host): never matches a message origin
    }
  }
  return [...origins]
}

/** The Gnos3 origins the backend allows to frame the app. Empty on any failure (accept nothing). */
export async function fetchGnos3Origins(apiBaseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${apiBaseUrl}${GNOS3_EMBED_CONFIG_PATH}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return []
    const body: unknown = await response.json()
    const list = (body as { parent_origins?: unknown } | null)?.parent_origins
    return Array.isArray(list) ? toOrigins(list) : []
  } catch {
    return []
  }
}

interface ThemeMessageLike {
  origin: string
  source: unknown
  data: unknown
}

/** The theme carried by a `gnos3:theme` message from the parent frame, or null if it is anything else. */
export function readGnos3ThemeMessage(
  event: ThemeMessageLike,
  allowedOrigins: readonly string[],
  parent: unknown = globalThis.parent,
): Gnos3Theme | null {
  if (event.source !== parent) return null
  if (!allowedOrigins.includes(event.origin)) return null
  const data = event.data as { type?: unknown; theme?: unknown } | null
  if (!data || typeof data !== 'object' || data.type !== GNOS3_THEME_MESSAGE) return null
  return isGnos3Theme(data.theme) ? data.theme : null
}

/**
 * Follow Gnos3's theme while framed: accept `gnos3:theme` only from the parent window and only
 * from an origin in the backend's frame-ancestors list. Messages that arrive before that list
 * has loaded are held (the latest one) and checked once it has. Returns a stop function.
 */
export function listenForGnos3Theme(
  onTheme: (theme: Gnos3Theme) => void,
  loadOrigins: () => Promise<string[]>,
): () => void {
  if (typeof window === 'undefined' || !isFramed()) return () => {}

  let allowed: string[] | null = null
  let pending: ThemeMessageLike | null = null

  const handle = (event: ThemeMessageLike) => {
    const theme = readGnos3ThemeMessage(event, allowed ?? [])
    if (theme) {
      setGnos3Theme(theme)
      onTheme(theme)
    }
  }

  const onMessage = (event: MessageEvent) => {
    if (allowed === null) {
      pending = { origin: event.origin, source: event.source, data: event.data }
      return
    }
    handle(event)
  }

  window.addEventListener('message', onMessage)
  void loadOrigins().then((origins) => {
    allowed = origins
    if (pending) handle(pending)
    pending = null
  })
  return () => window.removeEventListener('message', onMessage)
}

// Record the entry as early as possible: this module is imported by lib/theme.ts, which the
// theme store reads at import time.
captureGnos3Entry()
