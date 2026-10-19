import { z } from 'zod'

import type { Currency } from './currencies.js'
import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'
import { amountSchema } from './limits.js'

/**
 * The goal routes' contract: the bodies the write routes accept, the args
 * the search route accepts, and the rows they answer with. The session of
 * the caller names the tenant — no body or query ever does.
 */

/**
 * A calendar date crosses the wire as `YYYY-MM-DD` — the shape the `date`
 * column stores, so no timezone shifts a goal's day at either end.
 */
export const dateOnlySchema = z.iso.date('Enter a date like 2026-01-31.')

/** The body creating a goal accepts. */
export const createGoalSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
  linkedAccountId: z
    .number({ error: 'Pick an account.' })
    .int()
    .positive('Pick an account.'),
  balance: amountSchema,
  balanceDt: dateOnlySchema,
  targetBalance: amountSchema,
  targetDt: dateOnlySchema.nullish(),
})

/** The body updating a goal accepts: the same fields, plus which row. */
export const updateGoalSchema = createGoalSchema.extend({
  id: z.number().int().positive(),
})

/** What a goal search filters on. Without a status, only ACTIVE rows. */
export const goalFilterSchema = z.object({
  linkedAccountId: z.number().int().positive().optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a goal filter. */
export const searchGoalsSchema = fetchArgsSchema.extend({
  filter: goalFilterSchema.prefault({}),
})

export type CreateGoalBody = z.infer<typeof createGoalSchema>
export type UpdateGoalBody = z.infer<typeof updateGoalSchema>
export type SearchGoalsArgs = z.infer<typeof searchGoalsSchema>

/**
 * What the goal routes return: the wire shape, dates as ISO strings —
 * `balanceDt` and `targetDt` as `YYYY-MM-DD`, instants as full ISO. The
 * `accountName` comes joined from the `accounts` table on every read, so
 * the UI never has to resolve a `linkedAccountId` — and the name survives
 * even when the account was deleted.
 *
 * A goal stores no currency: it is denominated in the tenant's main
 * currency, which the API fills into `currency`. `accountCurrency` is the
 * linked account's, joined — when the two differ (the main currency changed
 * after the goal was set), the goal no longer tracks its account.
 */
export type Goal = {
  id: number
  name: string
  linkedAccountId: number
  accountName: string
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
  currency: Currency
  accountCurrency: Currency
  status: EntityStatus
  createdDt: string
  updateDt: string
}
