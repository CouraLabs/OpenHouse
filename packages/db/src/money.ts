import {
  centsToDecimal,
  decimalToCents,
  MAX_MONEY_CENTS,
} from '@workspace/domain'
import { customType } from 'drizzle-orm/sqlite-core'

export { centsToDecimal, decimalToCents, MAX_MONEY_CENTS }

export const money = customType<{ data: string; driverData: number }>({
  dataType() {
    return 'integer'
  },
  toDriver(value: string) {
    return decimalToCents(value)
  },
  fromDriver(value: number) {
    return centsToDecimal(value)
  },
})
