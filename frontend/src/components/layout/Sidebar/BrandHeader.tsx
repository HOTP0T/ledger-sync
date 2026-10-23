import { ChevronDown } from 'lucide-react'

import BrandLockup from '@/components/shared/BrandLockup'

/** Sidebar header outside Gnos3: the Gnos3 lockup with "Finances", and the account menu. */
export default function BrandHeader({
  user,
  onOpenProfile,
}: Readonly<{
  user: { full_name?: string | null; email: string } | null
  onOpenProfile: () => void
}>) {
  return (
    <button
      type="button"
      onClick={onOpenProfile}
      aria-label={`Account: ${user?.email || 'Financial Dashboard'}`}
      // Phones: start right of the fixed menu button (Sidebar.tsx), which sits over this corner.
      className="w-full flex items-center gap-3 pl-[4.5rem] pr-4 lg:pl-4 py-4 border-b border-border hover:bg-[var(--overlay-2)] transition-colors duration-150 group/brand"
    >
      <div className="flex-1 min-w-0 text-left space-y-2">
        <BrandLockup align="start" />
        <p className="text-xs text-text-tertiary truncate leading-tight">
          {user?.email || 'Financial Dashboard'}
        </p>
      </div>
      <ChevronDown
        size={16}
        className="text-text-quaternary flex-shrink-0 group-hover/brand:text-muted-foreground transition-colors duration-150"
      />
    </button>
  )
}
