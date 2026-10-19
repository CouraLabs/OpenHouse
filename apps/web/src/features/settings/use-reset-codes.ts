import { useMutation } from '@tanstack/react-query'
import type { IssueResetCodeBody, IssuedResetCode } from '@workspace/poco'

import { api } from '@/lib/api.js'

/** Issues a one-time, 30-minute reset code for a member — owner only. */
export function useIssueResetCode() {
  return useMutation({
    mutationFn: (body: IssueResetCodeBody) =>
      api<IssuedResetCode>('/auth/password/reset-codes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

/**
 * The link a member opens to redeem a reset code. The code rides in the
 * fragment, which the browser never sends: it stays out of server logs and
 * the Referer header.
 */
export function resetLinkFor(code: string): string {
  return `${window.location.origin}/reset-password#code=${encodeURIComponent(code)}`
}
