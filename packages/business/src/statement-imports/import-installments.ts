import { type ImportInstallment } from '@workspace/dto'

import {
  detectInstallmentMarker,
  normalizeImportText,
} from './statement-imports.js'

export interface InstallmentLink {
  groupId: string
  number: number
  count: number
}

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
