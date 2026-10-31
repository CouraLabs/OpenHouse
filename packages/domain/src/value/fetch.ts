export const entityStatuses = ['ACTIVE', 'DELETED'] as const

export type EntityStatus = (typeof entityStatuses)[number]

export interface SortClause {
  field: string
  dir: 'asc' | 'desc'
}

export interface FetchArgs {
  sort: SortClause[]
  filter: Record<string, unknown>
  skip: number
  limit: number
}

export interface PagedResults<T> {
  total: number
  items: T[]
}
