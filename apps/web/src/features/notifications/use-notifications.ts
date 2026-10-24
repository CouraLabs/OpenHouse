import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CalendarFeed,
  NotificationList,
  NotificationPreferences,
  PushConfig,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every notification query lives under. */
export const NOTIFICATIONS_KEY = ['notifications'] as const

/** How often the bell looks for new entries, in milliseconds. */
const POLL_MS = 60_000

/** The notification centre: the latest entries and the unread count the
 * bell shows. Polled, so a reminder the hourly job stored shows up without
 * a reload. */
export function useNotifications() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list'],
    queryFn: ({ signal }) =>
      api<NotificationList>('/notifications', { signal }),
    refetchInterval: POLL_MS,
  })
}

/** Marks every notification read. */
export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<void>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

/** Marks one notification read. */
export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

/** The signed-in user's reminder preferences. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'preferences'],
    queryFn: ({ signal }) =>
      api<NotificationPreferences>('/notifications/preferences', { signal }),
  })
}

/** Saves the reminder preferences. */
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

/** Whether the server can push, and the key a subscription is made against. */
export function usePushConfig() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'push-config'],
    queryFn: ({ signal }) =>
      api<PushConfig>('/notifications/push-config', { signal }),
    staleTime: Infinity,
  })
}

/** The user's calendar feed, or none yet. */
export function useCalendarFeed() {
  return useQuery({
    queryKey: ['calendar', 'feed'],
    queryFn: ({ signal }) => api<CalendarFeed>('/calendar/feed', { signal }),
  })
}

/** Creates the calendar feed, or replaces its secret so the old URL dies. */
export function useRotateCalendarFeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<CalendarFeed>('/calendar/feed', { method: 'POST' }),
    onSuccess: (feed) => queryClient.setQueryData(['calendar', 'feed'], feed),
  })
}

/** Deletes the calendar feed. */
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
