import { hexToRgba, rawColors } from '@/constants/colors'

export type HeatmapMode = 'expense' | 'income' | 'net'

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// Five-step ramps (empty cell, then 20 / 40 / 65 / 90 % of the mode's colour), from the
// Gnos3 tokens behind expense (destructive), income (success) and net (Gnos3 Blue).
const ramp = (color: string) => [
  rawColors.chart.grid,
  hexToRgba(color, 0.2),
  hexToRgba(color, 0.4),
  hexToRgba(color, 0.65),
  hexToRgba(color, 0.9),
]

export const heatmapColors: Record<HeatmapMode, string[]> = {
  expense: ramp(rawColors.app.red),
  income: ramp(rawColors.app.green),
  net: ramp(rawColors.app.blue),
}

export const modeAccent: Record<HeatmapMode, string> = {
  expense: rawColors.app.red,
  income: rawColors.app.green,
  net: rawColors.app.blue,
}
