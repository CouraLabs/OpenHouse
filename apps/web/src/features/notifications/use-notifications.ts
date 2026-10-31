import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CalendarFeed, NotificationList, NotificationPreferences, PushConfig } from '@workspace/dto'

import { api } from '@/lib/api.js'

export const NOTIFICATIONS_KEY = ['notifications'] as const

const POLL_MS = 60_000

export function useNotifications() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list'],
    queryFn: ({ signal }) =>
      api<NotificationList>('/notifications', { signal }),
    refetchInterval: POLL_MS,
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<void>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'preferences'],
    queryFn: ({ signal }) =>
      api<NotificationPreferences>('/notifications/preferences', { signal }),
  })
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: NotificationPreferences) =>
      api<NotificationPreferences>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) =>
      queryClient.setQueryData([...NOTIFICATIONS_KEY, 'preferences'], saved),
  })
}

export function usePushConfig() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'push-config'],
    queryFn: ({ signal }) =>
      api<PushConfig>('/notifications/push-config', { signal }),
    staleTime: Infinity,
  })
}

export function useCalendarFeed() {
  return useQuery({
    queryKey: ['calendar', 'feed'],
    queryFn: ({ signal }) => api<CalendarFeed>('/calendar/feed', { signal }),
  })
}

export function useRotateCalendarFeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<CalendarFeed>('/calendar/feed', { method: 'POST' }),
    onSuccess: (feed) => queryClient.setQueryData(['calendar', 'feed'], feed),
  })
}

export function useRemoveCalendarFeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<void>('/calendar/feed', { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.setQueryData<CalendarFeed>(['calendar', 'feed'], {
        path: null,
      }),
  })
}
