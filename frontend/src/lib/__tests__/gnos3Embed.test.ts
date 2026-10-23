import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GNOS3_EMBED_KEY,
  GNOS3_LANG_KEY,
  GNOS3_THEME_KEY,
  captureGnos3Entry,
  getGnos3Locale,
  getGnos3Theme,
  insideGnos3,
  listenForGnos3Theme,
  readGnos3ThemeMessage,
  toOrigins,
} from '../gnos3Embed'

const GNOS3 = 'http://localhost:8080'

/** Pretend the document is (or is not) inside a frame. */
function setFramed(framed: boolean) {
  const fakeTop = framed ? ({} as Window) : window
  vi.spyOn(window, 'top', 'get').mockReturnValue(fakeTop)
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('captureGnos3Entry', () => {
  it('stores theme, locale and the frame flag from a framed Gnos3 sign-in URL', () => {
    setFramed(true)
    captureGnos3Entry('?gnos3_token=abc&theme=dark&lang=zh-TW')
    expect(sessionStorage.getItem(GNOS3_EMBED_KEY)).toBe('1')
    expect(getGnos3Theme()).toBe('dark')
    expect(getGnos3Locale()).toBe('zh-TW')
    expect(insideGnos3()).toBe(true)
  })

  it('ignores URLs without a Gnos3 token', () => {
    setFramed(true)
    captureGnos3Entry('?theme=dark&lang=fr-FR')
    expect(sessionStorage.getItem(GNOS3_THEME_KEY)).toBeNull()
    expect(sessionStorage.getItem(GNOS3_LANG_KEY)).toBeNull()
    expect(insideGnos3()).toBe(false)
  })

  it('is not "inside Gnos3" when the sign-in page is opened on its own', () => {
    setFramed(false)
    captureGnos3Entry('?gnos3_token=abc&theme=light')
    expect(insideGnos3()).toBe(false)
    expect(getGnos3Theme()).toBe('light')
  })

  it('drops invalid theme and locale values', () => {
    setFramed(true)
    captureGnos3Entry('?gnos3_token=abc&theme=oled&lang=<script>')
    expect(getGnos3Theme()).toBeNull()
    expect(getGnos3Locale()).toBeNull()
  })
})

describe('toOrigins', () => {
  it('keeps exact http(s) origins and drops keywords, wildcards and junk', () => {
    expect(
      toOrigins(["'self'", 'http://localhost:8080/', 'https://*.example.com', 'gnos3.local', 42, 'https://g.example:443']),
    ).toEqual(['http://localhost:8080', 'https://g.example'])
  })
})

describe('readGnos3ThemeMessage', () => {
  const parent = {}
  const message = (over: Partial<{ origin: string; source: unknown; data: unknown }> = {}) => ({
    origin: GNOS3,
    source: parent,
    data: { type: 'gnos3:theme', theme: 'dark' },
    ...over,
  })

  it('accepts a theme from an allowed origin in the parent window', () => {
    expect(readGnos3ThemeMessage(message(), [GNOS3], parent)).toBe('dark')
  })

  it('rejects other origins, other windows, other types and bad themes', () => {
    expect(readGnos3ThemeMessage(message({ origin: 'http://evil.example' }), [GNOS3], parent)).toBeNull()
    expect(readGnos3ThemeMessage(message({ source: {} }), [GNOS3], parent)).toBeNull()
    expect(readGnos3ThemeMessage(message({ data: { type: 'other', theme: 'dark' } }), [GNOS3], parent)).toBeNull()
    expect(readGnos3ThemeMessage(message({ data: { type: 'gnos3:theme', theme: 'oled' } }), [GNOS3], parent)).toBeNull()
    expect(readGnos3ThemeMessage(message({ data: 'gnos3:theme' }), [GNOS3], parent)).toBeNull()
  })
})

describe('listenForGnos3Theme', () => {
  it('applies a message that arrived before the origin list, once the list allows it', async () => {
    setFramed(true)
    let resolveOrigins: (origins: string[]) => void = () => {}
    const onTheme = vi.fn()
    const stop = listenForGnos3Theme(onTheme, () => new Promise((r) => { resolveOrigins = r }))

    window.dispatchEvent(
      new MessageEvent('message', { origin: GNOS3, source: window.parent, data: { type: 'gnos3:theme', theme: 'dark' } }),
    )
    expect(onTheme).not.toHaveBeenCalled()

    resolveOrigins([GNOS3])
    await Promise.resolve()
    await Promise.resolve()
    expect(onTheme).toHaveBeenCalledWith('dark')
    expect(sessionStorage.getItem(GNOS3_THEME_KEY)).toBe('dark')

    window.dispatchEvent(
      new MessageEvent('message', { origin: 'http://evil.example', source: window.parent, data: { type: 'gnos3:theme', theme: 'light' } }),
    )
    expect(onTheme).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does nothing outside a frame', () => {
    setFramed(false)
    const load = vi.fn(async () => [GNOS3])
    listenForGnos3Theme(vi.fn(), load)
    expect(load).not.toHaveBeenCalled()
  })
})
