import gnos3Lockup from '@/assets/brand/gnos3-lockup-horizontal.svg'
import gnos3LockupWhite from '@/assets/brand/gnos3-lockup-horizontal-white.svg'
import { cn } from '@/lib/cn'
import { useThemeStore } from '@/store/themeStore'

/**
 * The Gnos3 horizontal lockup with the module name under it, for Finances opened outside
 * Gnos3 (its own URL, sign-in, errors). Inside the Gnos3 frame nothing is branded: callers
 * check `insideGnos3()` and leave this out. Brand Kit rule: the standard lockup on light
 * backgrounds, the white one on dark; never "Gnos3" typed next to the mark.
 */
export default function BrandLockup({
  align = 'center',
  className,
}: Readonly<{ align?: 'center' | 'start'; className?: string }>) {
  const resolved = useThemeStore((s) => s.resolved)
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <img
        src={resolved === 'dark' ? gnos3LockupWhite : gnos3Lockup}
        alt="Gnos3"
        width={100}
        height={32}
        className="h-8 w-auto select-none"
        draggable={false}
      />
      <span className="text-sm font-semibold leading-none text-foreground">Finances</span>
    </div>
  )
}
