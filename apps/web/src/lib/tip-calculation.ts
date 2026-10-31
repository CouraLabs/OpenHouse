import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api.js'

export function useTipCalculation<Result>(
  calculation: string,
  input: object | undefined
) {
  return useQuery({
    queryKey: ['tips', calculation, input],
    queryFn: ({ signal }) =>
      api<Result>(`/tips/${calculation}`, {
        method: 'POST',
        body: JSON.stringify(input),
        signal,
      }),
    enabled: input !== undefined,
    placeholderData: keepPreviousData,
  })
}
