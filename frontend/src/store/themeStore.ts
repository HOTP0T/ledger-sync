/**
 * Theme store -- single source of truth for the active theme mode.
 *
 * Holds the user's chosen `mode` ('dark' | 'light' | 'system') and the
 * `resolved` concrete theme ('dark' | 'light'). Setting the mode persists it
 * and applies `data-theme` to <html> via the theme lib. A `ThemeWatcher`
 * (mounted in App) keeps `resolved` in sync when the OS preference changes
 * while in 'system' mode. Inside Gnos3, `applyGnos3Theme` follows the theme
 * Gnos3 posts to the frame (see lib/gnos3Embed.ts).
 */

import { create } from 'zustand'

import {
  type ThemeMode,
  getStoredThemeMode,
  resolveTheme,
  applyTheme,
  setThemeMode as persistThemeMode,
} from '@/lib/theme'
import type { Gnos3Theme } from '@/lib/gnos3Embed'

interface ThemeState {
  mode: ThemeMode
  resolved: 'dark' | 'light'
  setMode: (mode: ThemeMode) => void
  /** Apply a theme sent by Gnos3 (already stored for the session by gnos3Embed). */
  applyGnos3Theme: (theme: Gnos3Theme) => void
  /** Re-resolve from the current mode (used when the OS preference changes). */
  syncResolved: () => void
}

const initialMode = getStoredThemeMode()

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolved: resolveTheme(initialMode),
  setMode: (mode) => {
    const resolved = persistThemeMode(mode)
    set({ mode, resolved })
  },
  applyGnos3Theme: (theme) => {
    applyTheme(theme)
    set({ mode: theme, resolved: theme })
  },
  syncResolved: () => {
    const resolved = resolveTheme(get().mode)
    applyTheme(resolved)
    set({ resolved })
  },
}))
