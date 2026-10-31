import { z } from "zod"
import { currencies, type Currency } from "@workspace/domain"

export { currencies, type Currency }

export const currencySchema = z.enum(currencies, { error: "Pick a currency." })
