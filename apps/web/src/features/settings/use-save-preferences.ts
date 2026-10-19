import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  SessionResponse,
  UpdatePreferencesBody,
  UserPreferences,
} from '@workspace/poco'

import { api } from '@/lib/api.js'
import { SESSION_QUERY_KEY } from '@/lib/query.js'

/** Saves the signed-in user's own preferences and folds them into the
 * session user that carries them. */
export function useSavePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdatePreferencesBody) =>
      api<UserPreferences>('/preferences', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (preferences) => {
      queryClient.setQueryData<SessionResponse | null>(
        SESSION_QUERY_KEY,
        (session) =>
          session == null
            ? session
            : { ...session, user: { ...session.user, ...preferences } }
      )
    },
  })
}
