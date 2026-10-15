import { z } from 'zod'

/**
 * The vocabulary every list route shares: how a client asks for a page of
 * rows and what the API answers with. `filter` stays generic here — each
 * feature extends `fetchArgsSchema` with the filter it understands.
 */

/** The lifecycle status every tenant entity carries. The database spelling
 * of this vocabulary lives in `@workspace/db` (`entityStatuses`) — keep the
 * two in step. */
export const entityStatuses = ['ACTIVE', 'DELETED'] as const

export const entityStatusSchema = z.enum(entityStatuses)

export type EntityStatus = (typeof entityStatuses)[number]

/** One sort clause: which field and which way. */
export const sortClauseSchema = z.object({
  field: z.string().min(1).max(64),
  dir: z.enum(['asc', 'desc']),
})

/**
 * The body a paged search route accepts. The client names no tenant and no
 * column internals — a `field` here is a name the API resolves against a
 * whitelist, never a column expression.
 */
export const fetchArgsSchema = z.object({
  sort: z.array(sortClauseSchema).max(3).default([]),
  filter: z.record(z.string(), z.unknown()).default({}),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
})

export type FetchArgs = z.infer<typeof fetchArgsSchema>

/** What a paged search route answers with. */
export type PagedResults<T> = {
  total: number
  items: T[]
}
