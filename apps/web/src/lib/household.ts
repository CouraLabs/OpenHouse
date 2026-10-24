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
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every household query lives under. */
export const HOUSEHOLD_KEY = ['household'] as const

/** The household's members, removed ones included. */
export function useHouseholdMembers() {
  return useQuery({
    queryKey: [...HOUSEHOLD_KEY, 'members'],
    queryFn: ({ signal }) =>
      api<HouseholdMember[]>('/household/members', { signal }),
  })
}

/** The balances, suggestions, spending, and settlements of the page. */
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

/** Reads what a member still holds, so a removal can warn first. */
export function useMemberBalanceCheck() {
  return useMutation({
    mutationFn: (id: number) =>
      api<MemberBalanceCheck>(`/household/members/${id}/balance`),
  })
}

/** Records a settle-up: a transfer between the members' accounts. */
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
