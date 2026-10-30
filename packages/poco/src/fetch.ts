import { z } from 'zod'

export const entityStatuses = ['ACTIVE', 'DELETED'] as const

export const entityStatusSchema = z.enum(entityStatuses)

export type EntityStatus = (typeof entityStatuses)[number]

export const sortClauseSchema = z.object({
  field: z.string().min(1).max(64),
  dir: z.enum(['asc', 'desc']),
})

export const fetchArgsSchema = z.object({
  sort: z.array(sortClauseSchema).max(3).default([]),
  filter: z.record(z.string(), z.unknown()).default({}),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
})

export type FetchArgs = z.infer<typeof fetchArgsSchema>

export type PagedResults<T> = {
  total: number
  items: T[]
}
