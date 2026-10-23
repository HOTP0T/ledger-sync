/**
 * Centralized App Color Palette
 *
 * Single source of truth: CSS variables in index.css.
 * This file reads computed values at runtime so JS/Recharts/SVG always
 * match whatever is defined in CSS — change index.css and everything updates.
 *
 * Usage in components:
 * - Tailwind classes: `text-app-blue`, `bg-app-green/20`, etc.
 * - Inline styles:   `colors.app.blue` (returns `var(--color-app-blue)`)
 * - Recharts/SVG:    `rawColors.app.blue` (returns resolved hex like `#12489A`)
 *
 * The values are the Gnos3 design tokens (index.css, "GNOS3 DESIGN TOKENS"). The fallbacks
 * below are their light values, used only when there is no DOM.
 */

// Helper to reference CSS variables (for inline style props)
export const cssVar = (variable: string) => `var(${variable})`

/**
 * Read a CSS custom property's computed hex value from :root.
 * Falls back to the provided default if DOM isn't available (SSR).
 */
function resolveColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value || fallback
}

/**
 * Convert a resolved hex color to an rgba string at a given opacity.
 * Handles both #RRGGBB and #RGB formats.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '')
  const r = Number.parseInt(cleaned.length === 3 ? cleaned[0] + cleaned[0] : cleaned.slice(0, 2), 16)
  const g = Number.parseInt(cleaned.length === 3 ? cleaned[1] + cleaned[1] : cleaned.slice(2, 4), 16)
  const b = Number.parseInt(cleaned.length === 3 ? cleaned[2] + cleaned[2] : cleaned.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ─── CSS var() references (for React inline styles) ──────────────────────────

export const colors = {
  app: {
    blue: cssVar('--color-app-blue'),
    blueVibrant: cssVar('--color-app-blue-vibrant'),
    green: cssVar('--color-app-green'),
    greenVibrant: cssVar('--color-app-green-vibrant'),
    red: cssVar('--color-app-red'),
    redVibrant: cssVar('--color-app-red-vibrant'),
    orange: cssVar('--color-app-orange'),
    orangeVibrant: cssVar('--color-app-orange-vibrant'),
    yellow: cssVar('--color-app-yellow'),
    yellowVibrant: cssVar('--color-app-yellow-vibrant'),
    teal: cssVar('--color-app-teal'),
    tealVibrant: cssVar('--color-app-teal-vibrant'),
    purple: cssVar('--color-app-purple'),
    purpleVibrant: cssVar('--color-app-purple-vibrant'),
    pink: cssVar('--color-app-pink'),
    pinkVibrant: cssVar('--color-app-pink-vibrant'),
    indigo: cssVar('--color-app-indigo'),
    indigoVibrant: cssVar('--color-app-indigo-vibrant'),
  },
  semantic: {
    success: cssVar('--color-success'),
    warning: cssVar('--color-warning'),
    error: cssVar('--color-error'),
    info: cssVar('--color-info'),
  },
  financial: {
    income: cssVar('--color-income'),
    expense: cssVar('--color-expense'),
    savings: cssVar('--color-savings'),
    transfer: cssVar('--color-transfer'),
    investment: cssVar('--color-investment'),
  },
  text: {
    primary: cssVar('--color-text-primary'),
    secondary: cssVar('--color-text-secondary'),
    tertiary: cssVar('--color-text-tertiary'),
    quaternary: cssVar('--color-text-quaternary'),
  },
  ui: {
    background: cssVar('--color-background'),
    foreground: cssVar('--color-foreground'),
    card: cssVar('--color-card'),
    cardForeground: cssVar('--color-card-foreground'),
    border: cssVar('--color-border'),
    borderStrong: cssVar('--color-border-strong'),
    muted: cssVar('--color-muted'),
    mutedForeground: cssVar('--color-muted-foreground'),
    primary: cssVar('--color-primary'),
    primaryForeground: cssVar('--color-primary-foreground'),
    link: cssVar('--color-link'),
  },
} as const

// ─── Resolved hex values (for Recharts, SVG, canvas — reads from CSS at runtime) ─

/** Call once after DOM is ready (e.g. in a top-level useEffect or module scope). */
function buildRawColors() {
  const r = (v: string, fb: string) => resolveColor(v, fb)
  return {
    app: {
      blue:           r('--color-app-blue',           '#12489A'),
      blueVibrant:    r('--color-app-blue-vibrant',   '#12489A'),
      green:          r('--color-app-green',           '#008236'),
      greenVibrant:   r('--color-app-green-vibrant',  '#008236'),
      red:            r('--color-app-red',             '#e7000b'),
      redVibrant:     r('--color-app-red-vibrant',    '#e7000b'),
      orange:         r('--color-app-orange',          '#eb6834'),
      orangeVibrant:  r('--color-app-orange-vibrant', '#eb6834'),
      yellow:         r('--color-app-yellow',          '#bb4d00'),
      yellowVibrant:  r('--color-app-yellow-vibrant', '#bb4d00'),
      teal:           r('--color-app-teal',            '#1baf7a'),
      tealVibrant:    r('--color-app-teal-vibrant',   '#1baf7a'),
      purple:         r('--color-app-purple',          '#4a3aa7'),
      purpleVibrant:  r('--color-app-purple-vibrant', '#4a3aa7'),
      pink:           r('--color-app-pink',            '#e87ba4'),
      pinkVibrant:    r('--color-app-pink-vibrant',   '#e87ba4'),
      indigo:         r('--color-app-indigo',          '#2a78d6'),
      indigoVibrant:  r('--color-app-indigo-vibrant', '#2a78d6'),
    },
    financial: {
      income:     r('--color-income',     '#008236'),
      expense:    r('--color-expense',    '#e7000b'),
      savings:    r('--color-savings',    '#4a3aa7'),
      transfer:   r('--color-transfer',   '#1baf7a'),
      investment: r('--color-investment', '#2a78d6'),
    },
    text: {
      primary:    r('--color-text-primary',    '#0C1422'),
      secondary:  r('--color-text-secondary',  '#56637A'),
      tertiary:   r('--color-text-tertiary',   '#56637A'),
      quaternary: r('--color-text-quaternary', '#93a0b6'),
    },
    // The Gnos3 guide's eight chart colours (--chart-1 ... --chart-8), in its order: every
    // neighbouring pair passes the colour-blindness check in both themes. Assign categorical
    // series in this order.
    series: [
      r('--chart-1', '#2a78d6'),
      r('--chart-2', '#eb6834'),
      r('--chart-3', '#1baf7a'),
      r('--chart-4', '#eda100'),
      r('--chart-5', '#e87ba4'),
      r('--chart-6', '#008300'),
      r('--chart-7', '#4a3aa7'),
      r('--chart-8', '#e34948'),
    ],
    // Chart-only neutrals/surfaces. CSS var() can't be used in SVG presentation
    // attributes, so these resolve the --chart-* tokens to concrete strings for
    // Recharts. Fallbacks are the light values so SSR/no-DOM is safe.
    chart: {
      textPrimary:         r('--chart-text-primary',         '#0C1422'),
      textSecondary:       r('--chart-text-secondary',       '#0C1422'),
      textMuted:           r('--chart-text-muted',           '#56637A'),
      textSubtle:          r('--chart-text-subtle',          '#56637A'),
      textDim:             r('--chart-text-dim',             '#93a0b6'),
      axisColor:           r('--chart-axis-color',           '#56637A'),
      grid:                r('--chart-grid',                 '#e9eef6'),
      axisLine:            r('--chart-axis-line',            '#DCE2EC'),
      cursor:              r('--chart-cursor',               'rgba(12, 20, 34, 0.06)'),
      referenceLine:       r('--chart-reference-line',       '#c6cedb'),
      referenceLineStrong: r('--chart-reference-line-strong', '#aab5c7'),
      activeStroke:        r('--chart-active-stroke',        'rgba(12, 20, 34, 0.30)'),
      svgStroke:           r('--chart-svg-stroke',           '#DCE2EC'),
      tooltipBg:           r('--chart-tooltip-bg',           '#ffffff'),
      tooltipBorder:       r('--chart-tooltip-border',       '#DCE2EC'),
      gridSolid:           r('--chart-grid-solid',           '#DCE2EC'),
      neutral:             r('--chart-neutral',              '#56637A'),
      muted:               r('--chart-muted',                '#93a0b6'),
      inputBg:             r('--chart-input-bg',             '#ffffff'),
      inputBorder:         r('--chart-input-border',         '#DCE2EC'),
    },
  }
}

// Resolved once at module load (DOM is ready by the time React renders)
export const rawColors = buildRawColors()

/**
 * Subscribers notified after `rawColors` is rebuilt. chartColors.ts registers
 * one to re-sync its derived `CHART_*` constants. Kept as a registry (rather
 * than importing chartColors here) so the dependency only flows one way:
 * chartColors imports colors, never the reverse.
 */
const rawColorsListeners = new Set<() => void>()

/** Register a callback to run after each `refreshRawColors()`. */
export function onRawColorsRefresh(listener: () => void): void {
  rawColorsListeners.add(listener)
}

/**
 * Rebuild the resolved color values IN PLACE on the existing `rawColors`
 * object, preserving its identity so modules that imported `rawColors` (and the
 * derived `CHART_*` constants in chartColors.ts) keep their reference and just
 * see fresh values. Call after a theme toggle (see lib/theme.ts applyTheme) so
 * Recharts repaints with the active theme's chart colors.
 */
export function refreshRawColors(): void {
  const next = buildRawColors()
  Object.assign(rawColors.app, next.app)
  Object.assign(rawColors.financial, next.financial)
  Object.assign(rawColors.text, next.text)
  Object.assign(rawColors.chart, next.chart)
  rawColors.series.splice(0, rawColors.series.length, ...next.series)
  for (const listener of rawColorsListeners) listener()
}

// ─── MetricCard color configs (derived from rawColors) ───────────────────────

interface MetricColorEntry {
  bg: string
  text: string
  glow: string
  className: string
}

function buildMetricColorConfig() {
  const mc = (color: string, twClass: string): MetricColorEntry => ({
    bg: hexToRgba(color, 0.12),
    text: color,
    glow: hexToRgba(color, 0.15),
    className: twClass,
  })
  return {
    green:  mc(rawColors.app.green,  'text-app-green'),
    red:    mc(rawColors.app.red,    'text-app-red'),
    blue:   mc(rawColors.app.blue,   'text-app-blue'),
    purple: mc(rawColors.app.purple, 'text-app-purple'),
    yellow: mc(rawColors.app.yellow, 'text-app-yellow'),
    teal:   mc(rawColors.app.teal,   'text-app-teal'),
    orange: mc(rawColors.app.orange, 'text-app-orange'),
    indigo: mc(rawColors.app.indigo, 'text-app-indigo'),
  }
}

// Mutated in place on theme toggle so MetricCard's inline-style tint/glow/icon
// colors (baked rgba strings, not var()-backed) track the active theme. Kept as
// a stable object identity for importers; refreshed via onRawColorsRefresh below.
export const metricColorConfig = buildMetricColorConfig()

export type MetricColor = keyof typeof metricColorConfig

// Rebuild the derived metric tints after rawColors is re-resolved on a toggle.
onRawColorsRefresh(() => Object.assign(metricColorConfig, buildMetricColorConfig()))
