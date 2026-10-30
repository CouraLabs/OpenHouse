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

export function browserTimeZone(): string | undefined {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return isSupportedTimeZone(timeZone) ? timeZone : undefined
}

export function browserCurrency(): Currency {
  return currencyForLocale(navigator.language)
}

export function useTenantSettings(): TenantSettings {
  const session = useSession()

  return (
    session.data?.settings ?? {
      timezone: browserTimeZone() ?? 'UTC',
      mainCurrency: browserCurrency(),
      timezoneConfirmed: true,
      unsplitMode: 'personal' as const,
    }
  )
}

export function useMainCurrency(): Currency {
  return useTenantSettings().mainCurrency
}

export function useTenantToday(): string {
  return todayIn(useTenantSettings().timezone)
}

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
      void queryClient.invalidateQueries()
    },
  })
}
