import type { ReactNode } from 'react'

import { Loader2 } from 'lucide-react'

import BrandLockup from '@/components/shared/BrandLockup'
import { insideGnos3 } from '@/lib/gnos3Embed'

/**
 * Full-page message for signing in, sign-in errors and an ended session. Outside Gnos3 it
 * carries the Gnos3 lockup with "Finances" under it, centred above the message (design guide,
 * "Logo inside a module"); inside the Gnos3 frame only the message, because Gnos3 owns the brand.
 */
export default function ModuleNotice({
  title,
  children,
  busy = false,
  action,
}: Readonly<{
  title: string
  children?: ReactNode
  busy?: boolean
  action?: ReactNode
}>) {
  const inside = insideGnos3()
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-10">
      <div
        className="w-full max-w-sm flex flex-col items-center gap-5 text-center"
        role={busy ? 'status' : undefined}
        aria-live={busy ? 'polite' : undefined}
      >
        {!inside && <BrandLockup />}
        {busy && <Loader2 className="w-6 h-6 text-app-blue animate-spin" aria-hidden="true" />}
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          {children && <p className="text-sm text-muted-foreground">{children}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}
