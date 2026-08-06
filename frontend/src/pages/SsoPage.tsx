/**
 * Gnos3 SSO Bootstrap Page
 *
 * Entry point when ledger-sync is embedded as a module inside the Gnos3-K4mi
 * stack. The Gnos3 host loads this route inside an iframe with a short-lived
 * exchange token: `/sso?gnos3_token=<jwt>`. We exchange it for a ledger-sync
 * session, then redirect into the app.
 *
 * Route: /sso
 */

import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import * as authApi from '@/services/api/auth'
import { prefetchCoreData } from '@/lib/prefetch'
import { ROUTES } from '@/constants'
import { getApiErrorMessage } from '@/lib/errorUtils'

export default function SsoPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, setTokens } = useAuthStore()
  const processedRef = useRef(false)

  useEffect(() => {
    // Prevent double-processing in React StrictMode
    if (processedRef.current) return
    processedRef.current = true

    const gnos3Token = searchParams.get('gnos3_token')

    if (!gnos3Token) {
      toast.error('Missing SSO token')
      navigate(ROUTES.HOME, { replace: true })
      return
    }

    const handleSso = async () => {
      try {
        // Clear demo mode if active (real login replaces demo session)
        if (useDemoStore.getState().isDemoMode) {
          useDemoStore.getState().exitDemo()
        }

        // Exchange the Gnos3 token for ledger-sync session tokens
        const tokens = await authApi.exchangeGnos3Token(gnos3Token)
        setTokens(tokens)

        // Fetch user profile
        const user = await authApi.getMe()
        login(user, tokens)

        // Prefetch data
        prefetchCoreData()

        navigate(ROUTES.DASHBOARD, { replace: true })
      } catch (err) {
        const message = getApiErrorMessage(err)
        toast.error(message)
        navigate(ROUTES.HOME, { replace: true })
      }
    }

    handleSso()
  }, [searchParams, navigate, login, setTokens])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-app-blue animate-spin" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
