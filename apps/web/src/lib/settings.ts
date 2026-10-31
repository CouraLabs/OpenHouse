import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  timeZoneSchema,
  type Currency,
  type SessionResponse,
  type SettingsDefaults,
  type TenantSettings,
  type UpdateSettingsBody,
} from '@workspace/dto'

import { api } from './api.js'
import { useSession } from './auth.js'
import { SESSION_QUERY_KEY } from './query.js'

export function browserTimeZone(): string | undefined {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return timeZoneSchema.safeParse(timeZone).success ? timeZone : undefined
}

export function useSettingsDefaults(locale = navigator.language) {
  return useQuery({
    queryKey: ['settings', 'defaults', locale],
    queryFn: ({ signal }) =>
      api<SettingsDefaults>(
        `/settings/defaults?locale=${encodeURIComponent(locale)}`,
        { signal }
      ),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useTenantSettings(): TenantSettings {
  const session = useSession()

  return (
    session.data?.settings ?? {
      timezone: browserTimeZone() ?? 'UTC',
      mainCurrency: 'USD',
      timezoneConfirmed: true,
      unsplitMode: 'personal' as const,
      today: '1970-01-01',
    }
  )
}

export function useMainCurrency(): Currency {
  return useTenantSettings().mainCurrency
}

export function useTenantToday(): string {
  return useTenantSettings().today
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
