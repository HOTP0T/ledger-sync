/**
 * Gnos3 SSO Bootstrap Page
 *
 * Entry point when Finances (ledger-sync) is a module of the Gnos3 stack. Gnos3 loads this
 * route in its iframe with a short-lived exchange token:
 *   /sso?gnos3_token=<jwt>&theme=light|dark&lang=<locale>
 * The theme and locale are recorded before render (public/theme-init.js, lib/gnos3Embed.ts);
 * here the token is exchanged for a Finances session and the app opens on the dashboard.
 *
 * Route: /sso
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ModuleNotice from '@/components/shared/ModuleNotice'
import { useAuthStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import * as authApi from '@/services/api/auth'
import { prefetchCoreData } from '@/lib/prefetch'
import { getApiErrorMessage } from '@/lib/errorUtils'
import { ROUTES } from '@/constants'

export default function SsoPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, setTokens } = useAuthStore()
  const processedRef = useRef(false)
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const gnos3Token = searchParams.get('gnos3_token')
  const error = gnos3Token ? exchangeError : 'This sign-in link has no Gnos3 token.'

  useEffect(() => {
    // Prevent double-processing in React StrictMode
    if (processedRef.current || !gnos3Token) return
    processedRef.current = true

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
        setExchangeError(getApiErrorMessage(err))
      }
    }

    handleSso()
  }, [gnos3Token, navigate, login, setTokens])

  if (error) {
    return (
      <ModuleNotice title="Could Not Sign You In">
        {error}
        <br />
        Open Finances again from the Gnos3 sidebar.
      </ModuleNotice>
    )
  }

  return <ModuleNotice title="Signing you in…" busy />
}
