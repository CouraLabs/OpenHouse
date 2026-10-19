import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  currencyForLocale,
  isSupportedTimeZone,
  todayIn,
  type Currency,
  type SessionResponse,
  type TenantSettings,
  type UpdateSettingsBody,
} from '@workspace/poco'

import { api } from './api.js'
import { useSession } from './auth.js'
import { SESSION_QUERY_KEY } from './query.js'

/** The browser's own IANA time zone — what a sign-up and the confirm
 * banner propose — or nothing when the browser reports a zone the API
 * would reject (a legacy alias some runtimes still answer with). */
export function browserTimeZone(): string | undefined {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return isSupportedTimeZone(timeZone) ? timeZone : undefined
}

/** The currency the browser locale suggests — the sign-up's default. */
export function browserCurrency(): Currency {
  return currencyForLocale(navigator.language)
}

/**
 * The tenant's settings, read from the session the app booted with. Only
 * signed-in pages call this; the browser's own zone and currency stand in
 * for the instant a sign-out clears the session before the page leaves.
 */
export function useTenantSettings(): TenantSettings {
  const session = useSession()

  return (
    session.data?.settings ?? {
      timezone: browserTimeZone() ?? 'UTC',
      mainCurrency: browserCurrency(),
      timezoneConfirmed: true,
    }
  )
}

/** The tenant's main currency — what money formats in and new records
 * start on by default. */
export function useMainCurrency(): Currency {
  return useTenantSettings().mainCurrency
}

/** Today, as a `YYYY-MM-DD` day, in the tenant's time zone — not the
 * device's. */
export function useTenantToday(): string {
  return todayIn(useTenantSettings().timezone)
}

/** Saves the tenant's settings (owner only) and refreshes the session that
 * carries them. */
export function useSaveSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateSettingsBody) =>
      api<TenantSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData<SessionResponse | null>(
        SESSION_QUERY_KEY,
        (session) => (session == null ? session : { ...session, settings })
      )
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}
