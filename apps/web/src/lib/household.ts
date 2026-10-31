import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  HouseholdMember,
  HouseholdOverview,
  HouseholdOverviewArgs,
  MemberBalanceCheck,
  SettleUpBody,
  Transaction,
} from '@workspace/dto'

import { api } from '@/lib/api.js'

export const HOUSEHOLD_KEY = ['household'] as const

export function useHouseholdMembers() {
  return useQuery({
    queryKey: [...HOUSEHOLD_KEY, 'members'],
    queryFn: ({ signal }) =>
      api<HouseholdMember[]>('/household/members', { signal }),
  })
}

export function useHouseholdOverview(args: HouseholdOverviewArgs) {
  return useQuery({
    queryKey: [...HOUSEHOLD_KEY, 'overview', args],
    queryFn: ({ signal }) =>
      api<HouseholdOverview>('/household/overview', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useMemberBalanceCheck() {
  return useMutation({
    mutationFn: (id: number) =>
      api<MemberBalanceCheck>(`/household/members/${id}/balance`),
  })
}

export function useSettleUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: SettleUpBody) =>
      api<Transaction[]>('/transactions/settle', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
