import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api.js'
import {
  currentPushSubscription,
  isPushSupported,
  needsHomeScreenInstall,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push.js'
import { usePushConfig } from './use-notifications.js'

const SUBSCRIPTION_KEY = ['push', 'subscription'] as const

export class PushDeniedError extends Error {}

export function usePushSubscription() {
  const queryClient = useQueryClient()
  const config = usePushConfig()
  const supported = isPushSupported()
  const subscription = useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: async () => (await currentPushSubscription())?.endpoint ?? null,
    enabled: supported,
  })

  const enable = useMutation({
    mutationFn: async () => {
      if (config.data?.publicKey == null) {
        throw new Error('Push is not configured on the server.')
      }

      const result = await subscribeToPush(config.data.publicKey)

      if (result.status !== 'subscribed') {
        throw new PushDeniedError(result.status)
      }

      await api<void>('/notifications/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify(result.subscription.toJSON()),
      })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  })

  const disable = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush()

      if (endpoint !== null) {
        await api<void>('/notifications/push-subscriptions', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint }),
        })
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  })

  return {
    supported,
    serverEnabled: config.data?.enabled === true,
    permission:
      typeof Notification === 'undefined' ? 'denied' : Notification.permission,
    subscribed: subscription.data != null,
    needsInstall: needsHomeScreenInstall(),
    enable,
    disable,
  }
}
