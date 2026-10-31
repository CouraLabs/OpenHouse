import { compareMoney } from '../calc/money.js'

export interface InstallmentState {
  id: number
  amount: string
  installmentNumber: number
  closeDate: string | null
}

export function isOpenInstallment(
  installment: Pick<InstallmentState, 'closeDate'>,
  today: string
): boolean {
  return installment.closeDate === null || installment.closeDate > today
}

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
