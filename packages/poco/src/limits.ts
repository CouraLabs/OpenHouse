import { z } from 'zod'

import type { Currency } from './currencies.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

/**
 * The limit routes' contract: the bodies the write routes accept, the args
 * the search route accepts, and the rows they answer with. The session of
 * the caller names the tenant — no body or query ever does.
 */

/** The periods a spending limit covers. The database spelling lives in
 * `@workspace/db` (`limitTypes`) — keep the two in step. A form picking a
 * period with nothing chosen gets the friendly message, not a type error. */
export const limitTypes = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export const limitTypeSchema = z.enum(limitTypes, { error: 'Pick a period.' })

export type LimitType = (typeof limitTypes)[number]

/**
 * A money amount crosses the wire as a string like `"12.34"` — the shape the
 * `decimal(16,2)` column stores, so money never travels through a float.
 */
export const amountSchema = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,2})?$/, 'Enter an amount like 12.34.')

/** The body creating a limit accepts. */
export const createLimitSchema = z.object({
  categoryId: z
    .number({ error: 'Pick a category.' })
    .int()
    .positive('Pick a category.'),
  amount: amountSchema,
  type: limitTypeSchema,
})

/** The body updating a limit accepts: the same fields, plus which row. */
export const updateLimitSchema = createLimitSchema.extend({
  id: z.number().int().positive(),
})

/** What a limit search filters on. Without a status, only ACTIVE rows. */
export const limitFilterSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  type: limitTypeSchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a limit filter. */
export const searchLimitsSchema = fetchArgsSchema.extend({
  filter: limitFilterSchema.prefault({}),
})

export type CreateLimitBody = z.infer<typeof createLimitSchema>
export type UpdateLimitBody = z.infer<typeof updateLimitSchema>
export type SearchLimitsArgs = z.infer<typeof searchLimitsSchema>

/**
 * One limit with what the tenant has already spent against it in the period
 * the limit covers — the pair a usage gauge renders. The `spent` total is
 * the sum of the period's expense transactions in the limit's category from
 * accounts in the main currency; transfer sides and Canceled transactions
 * never count. Expenses from accounts in other currencies are not converted
 * yet: `excludedCount` says how many were left out.
 */
export type LimitUsage = {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
  spent: string
  excludedCount: number
}

/**
 * What the limit routes return: the wire shape, dates as ISO strings. The
 * `categoryName` comes joined from the `categories` table on every read, so
 * the UI never has to resolve a `categoryId` — and the name survives even
 * when the category was deleted. A limit stores no currency: `currency` is
 * the tenant's main currency, filled in by the API.
 */
export type Limit = {
  id: number
  categoryId: number
  categoryName: string
  amount: string
  type: LimitType
  currency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
}
