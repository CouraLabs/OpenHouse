import { z } from 'zod'

import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

/**
 * The receiver routes' contract: the bodies the write routes accept, the
 * args the search route accepts, and the rows they answer with. The session
 * of the caller names the tenant — no body or query ever does.
 */

/**
 * The kinds of receiver a payment goes to. The database spelling lives in
 * `@workspace/db` (`receiverTypes`) — keep the two in step. A form picking
 * a kind with nothing chosen gets the friendly message, not a type error.
 */
export const receiverTypes = ['Person', 'Service', 'Merchant', 'Charity'] as const

export const receiverTypeSchema = z.enum(receiverTypes, {
  error: 'Pick a type.',
})

export type ReceiverType = (typeof receiverTypes)[number]

/** The body creating a receiver accepts. */
export const createReceiverSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
  type: receiverTypeSchema,
})

/** The body updating a receiver accepts: the same fields, plus which row. */
export const updateReceiverSchema = createReceiverSchema.extend({
  id: z.number().int().positive(),
})

/** What a receiver search filters on. Without a status, only ACTIVE rows. */
export const receiverFilterSchema = z.object({
  name: z.string().max(255).optional(),
  type: receiverTypeSchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

/** The search route's body: the shared paging envelope with a receiver filter. */
export const searchReceiversSchema = fetchArgsSchema.extend({
  filter: receiverFilterSchema.prefault({}),
})

export type CreateReceiverBody = z.infer<typeof createReceiverSchema>
export type UpdateReceiverBody = z.infer<typeof updateReceiverSchema>
export type SearchReceiversArgs = z.infer<typeof searchReceiversSchema>

/** The lightweight shape pickers read — what `GET /receivers` returns. */
export type ReceiverRef = {
  id: number
  name: string
  type: ReceiverType
}

/** What the receiver routes return: the wire shape, dates as ISO strings. */
export type Receiver = {
  id: number
  name: string
  type: ReceiverType
  status: EntityStatus
  createdDt: string
  updateDt: string
}
