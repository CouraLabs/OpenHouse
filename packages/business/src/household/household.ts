import {
  formatCents,
  toCents,
  type Currency,
  type DebtTransfer,
  type LedgerEntry,
  type MemberBalance,
} from "@workspace/domain"

export type { DebtTransfer, LedgerEntry, MemberBalance }

export function memberBalances(
  entries: readonly LedgerEntry[]
): MemberBalance[] {
  const byCurrency = new Map<Currency, Map<number, bigint>>()

  for (const entry of entries) {
    if (entry.payerUserId === null || entry.shares.length === 0) {
      continue
    }

    const members = byCurrency.get(entry.currency) ?? new Map<number, bigint>()

    byCurrency.set(entry.currency, members)

    const credit = (userId: number, cents: bigint) =>
      members.set(userId, (members.get(userId) ?? 0n) + cents)

    credit(entry.payerUserId, toCents(entry.amount))

    for (const share of entry.shares) {
      credit(share.userId, -toCents(share.share))
    }
  }

  return [...byCurrency]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([currency, members]) =>
      [...members]
        .sort(([a], [b]) => a - b)
        .map(([userId, cents]) => ({
          userId,
          currency,
          balance: formatCents(cents),
        }))
    )
}

export function simplifyDebts(
  balances: readonly MemberBalance[]
): DebtTransfer[] {
  const currencies = [
    ...new Set(balances.map((entry) => entry.currency)),
  ].sort()
  const transfers: DebtTransfer[] = []

  for (const currency of currencies) {
    const owed: Array<{ userId: number; cents: bigint }> = []
    const owing: Array<{ userId: number; cents: bigint }> = []

    for (const entry of balances) {
      if (entry.currency !== currency) {
        continue
      }

      const cents = toCents(entry.balance)

      if (cents > 0n) {
        owed.push({ userId: entry.userId, cents })
      } else if (cents < 0n) {
        owing.push({ userId: entry.userId, cents: -cents })
      }
    }

    const pay = (
      debtor: { userId: number; cents: bigint },
      creditor: { userId: number; cents: bigint },
      cents: bigint
    ) => {
      transfers.push({
        currency,
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: formatCents(cents),
      })
      debtor.cents -= cents
      creditor.cents -= cents
    }

    for (const debtor of owing) {
      const match = owed.find(
        (creditor) => creditor.cents > 0n && creditor.cents === debtor.cents
      )

      if (match !== undefined) {
        pay(debtor, match, debtor.cents)
      }
    }

    const byLargest = (
      a: { userId: number; cents: bigint },
      b: { userId: number; cents: bigint }
    ) =>
      a.cents === b.cents ? a.userId - b.userId : a.cents > b.cents ? -1 : 1

    for (;;) {
      const debtor = owing
        .filter((entry) => entry.cents > 0n)
        .sort(byLargest)[0]
      const creditor = owed
        .filter((entry) => entry.cents > 0n)
        .sort(byLargest)[0]

      if (debtor === undefined || creditor === undefined) {
        break
      }

      pay(
        debtor,
        creditor,
        debtor.cents < creditor.cents ? debtor.cents : creditor.cents
      )
    }
  }

  return transfers
}
