import type { AccountType } from "@workspace/domain"
import { addMoney } from "../calc/money.js"

export function availableLimit(account: {
  type: AccountType
  limit: string | null
  balance: string
}): string | null {
  if (account.type !== "Credit Card" || account.limit === null) {
    return null
  }

  return addMoney(account.limit, account.balance)
}
