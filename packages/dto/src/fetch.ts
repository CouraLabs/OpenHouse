import { z } from "zod"
import {
  entityStatuses,
  type EntityStatus,
  type FetchArgs,
  type PagedResults,
  type SortClause,
} from "@workspace/domain"

export {
  entityStatuses,
  type EntityStatus,
  type FetchArgs,
  type PagedResults,
  type SortClause,
}

export const entityStatusSchema = z.enum(entityStatuses)

export const sortClauseSchema = z.object({
  field: z.string().min(1).max(64),
  dir: z.enum(["asc", "desc"]),
})

export const fetchArgsSchema = z.object({
  sort: z.array(sortClauseSchema).max(3).default([]),
  filter: z.record(z.string(), z.unknown()).default({}),
  skip: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
})

const _assertFetchArgsType: z.ZodType<FetchArgs> = fetchArgsSchema
void _assertFetchArgsType
