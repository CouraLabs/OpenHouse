import { compareMoney } from '@workspace/poco'

/** One stored installment, as the group rules read it. */
export interface InstallmentState {
  id: number
  amount: string
  installmentNumber: number
  /** The exclusive close of the bill it is on, or nothing (a card whose
   * days were unset since). */
  closeDate: string | null
}

/**
 * Whether an installment is still on an Open bill — the only state in
 * which its money may change. Installments on a Closed or Paid bill are
 * history: the bank has already billed them.
 */
export function isOpenInstallment(
  installment: Pick<InstallmentState, 'closeDate'>,
  today: string
): boolean {
  return installment.closeDate === null || installment.closeDate > today
}

/**
 * What a group edit does to the money of a purchase:
 * - `meta`: the amounts and the count stay — only name, note, category,
 *   and receiver change, on every installment, billed ones included;
 * - `amounts`: the count stays, some amounts change — rows update in place;
 * - `resplit`: the count changes — the rows are soft-deleted and recreated.
 *
 * A money change (`amounts` or `resplit`) needs every installment Open; the
 * caller answers 409 otherwise. `parts` is the new split, installment 1
 * first; `count` the purchase's count as stored.
 */
export function planGroupEdit(
  installments: readonly InstallmentState[],
  count: number,
  parts: readonly string[]
): 'meta' | 'amounts' | 'resplit' {
  if (parts.length !== count || installments.length !== count) {
    return 'resplit'
  }

  const ordered = [...installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  )
  const same = ordered.every(
    (installment, index) => compareMoney(installment.amount, parts[index]) === 0
  )

  return same ? 'meta' : 'amounts'
}
