import {
  unpaidStatementStatuses,
  type CreditCardStatement,
  type StatementStatus,
  type StatementStatusInput,
} from "@workspace/domain"
import { compareMoney } from "../calc/money.js"

export type { CreditCardStatement, StatementStatus, StatementStatusInput }

export function deriveStatementStatus(
  input: StatementStatusInput
): StatementStatus {
  if (input.today < input.closeDate) {
    return "Open"
  }

  if (compareMoney(input.paid, input.owed) >= 0) {
    return "Paid"
  }

  if (input.today > input.dueDate) {
    return "Overdue"
  }

  return compareMoney(input.paid, "0") > 0 ? "PartiallyPaid" : "Closed"
}

export function isPrepaid(
  bill: Pick<CreditCardStatement, "status" | "paid">
): boolean {
  return bill.status === "Open" && compareMoney(bill.paid, "0") > 0
}

export function defaultPaymentStatement<
  T extends Pick<CreditCardStatement, "status" | "closeDate">,
>(bills: readonly T[]): T | undefined {
  const ordered = [...bills].sort((a, b) =>
    a.closeDate.localeCompare(b.closeDate)
  )

  return (
    ordered.find((bill) => unpaidStatementStatuses.includes(bill.status)) ??
    ordered.find((bill) => bill.status === "Open")
  )
}
