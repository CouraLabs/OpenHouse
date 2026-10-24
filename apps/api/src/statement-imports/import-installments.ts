import {
  detectInstallmentMarker,
  normalizeImportText,
  type ImportInstallment,
} from '@workspace/poco'

/** The installment group a committed row joins. */
export interface InstallmentLink {
  groupId: string
  number: number
  count: number
}

/**
 * Groups rows the user linked as installments (#6): rows sharing the
 * normalized merchant and the same count form one group, so `LOJA X PARC
 * 03/10` and `LOJA X PARC 04/10` of two statements become installments 3 and
 * 4 of one purchase instead of unrelated expenses. A row repeating a number
 * its group already has starts a group of its own — two separate purchases
 * at one shop. Answers, per row, its link or `null` for a row not linked.
 */
export function assignInstallmentGroups(
  rows: readonly { name: string; installment?: ImportInstallment | null }[],
  newGroupId: () => string
): (InstallmentLink | null)[] {
  const groups = new Map<string, { groupId: string; numbers: Set<number> }[]>()

  return rows.map((row) => {
    if (row.installment == null) {
      return null
    }

    const { number, count } = row.installment
    const merchant =
      detectInstallmentMarker(row.name)?.merchant ??
      normalizeImportText(row.name)
    const key = `${merchant}|${count}`
    const candidates = groups.get(key) ?? []
    let group = candidates.find((candidate) => !candidate.numbers.has(number))

    if (group === undefined) {
      group = { groupId: newGroupId(), numbers: new Set() }
      candidates.push(group)
      groups.set(key, candidates)
    }

    group.numbers.add(number)

    return { groupId: group.groupId, number, count }
  })
}
