import { asc, desc, type SQL, type SQLWrapper } from 'drizzle-orm'
import type { FetchArgs } from '@workspace/domain'
import { normalizeSearchName } from '../search-name.js'

export interface PagedQuery {
  where: SQL | undefined
  orderBy: SQL[]
  limit: number
  offset: number
}

export type SortableColumns = Record<string, SQLWrapper>

export function buildPagedQuery(
  args: FetchArgs,
  filter: SQL | undefined,
  sortableColumns: SortableColumns
): PagedQuery {
  const orderBy = args.sort
    .map((clause) => {
      const column = sortableColumns[clause.field]

      if (column === undefined) {
        return undefined
      }

      return clause.dir === 'desc' ? desc(column) : asc(column)
    })
    .filter((order) => order !== undefined)

  return {
    where: filter,
    orderBy,
    limit: args.limit,
    offset: args.skip,
  }
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

const MAX_LIKE_TERM_CHARS = 40

export function likePattern(term: string): string {
  return `%${escapeLikePattern(
    normalizeSearchName(term).slice(0, MAX_LIKE_TERM_CHARS)
  )}%`
}
