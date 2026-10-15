import { z } from 'zod'

/**
 * The currencies money can be denominated in across the tenant's records.
 * The database spelling of this vocabulary lives in `@workspace/db`
 * (`currencies`) — keep the two in step. A form picking a currency with
 * nothing chosen gets the friendly message, not a type error.
 */

export const currencies = ['USD', 'BRL', 'EUR'] as const

export const currencySchema = z.enum(currencies, { error: 'Pick a currency.' })

export type Currency = (typeof currencies)[number]
