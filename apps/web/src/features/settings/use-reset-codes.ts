import { useMutation } from '@tanstack/react-query'
import type { IssueResetCodeBody, IssuedResetCode } from '@workspace/poco'

import { api } from '@/lib/api.js'
import { appUrl } from '@/lib/app-url.js'

export function useIssueResetCode() {
  return useMutation({
    mutationFn: (body: IssueResetCodeBody) =>
      api<IssuedResetCode>('/auth/password/reset-codes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

export function resetLinkFor(code: string): string {
  return appUrl(`/reset-password#code=${encodeURIComponent(code)}`)
}
