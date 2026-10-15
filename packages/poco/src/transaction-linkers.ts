import { z } from 'zod'

import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

/**
 * The transaction linker routes' contract: the bodies the write routes
 * accept, the args the search route accepts, and the rows they answer with.
 * The session of the caller names the tenant — no body or query ever does.
 */

/** The body creating a transaction linker accepts. */
export const createTransactionLinkerSchema = z.object({
  description: z
    .string()
    .min(1, 'Enter a description.')
    .max(2000, 'Keep the description under 2000 characters.'),
  categoryId: z
    .number({ error: 'Pick a category.' })
    .int()
    .positive('Pick a category.'),
  receiverId: z.number().int().positive().nullish(),
})

/** The body updating a transaction linker accepts: the same fields, plus
 * which row. */
export const updateTransactionLinkerSchema =
  createTransactionLinkerSchema.extend({
    id: z.number().int().positive(),
  })

/** What a linker search filters on. Without a status, only ACTIVE rows. */
export const transactionLinkerFilterSchema = z.object({
  description: z.string().max(2000).optional(),
  categoryId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a linker filter. */
export const searchTransactionLinkersSchema = fetchArgsSchema.extend({
  filter: transactionLinkerFilterSchema.prefault({}),
})

export type CreateTransactionLinkerBody = z.infer<
  typeof createTransactionLinkerSchema
>
export type UpdateTransactionLinkerBody = z.infer<
  typeof updateTransactionLinkerSchema
>
export type SearchTransactionLinkersArgs = z.infer<
  typeof searchTransactionLinkersSchema
>

/**
 * What the linker routes return: the wire shape, dates as ISO strings. The
 * category and receiver names come joined on every read, so the UI never
 * has to resolve an id — and the names survive even when the referenced
 * row was deleted.
 */
export type TransactionLinker = {
  id: number
  description: string
  categoryId: number
  categoryName: string
  receiverId: number | null
  receiverName: string | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
