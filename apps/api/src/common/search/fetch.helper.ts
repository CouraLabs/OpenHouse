import { asc, desc, type SQL, type SQLWrapper } from 'drizzle-orm'

import type { FetchArgs } from '@workspace/poco'

/**
 * The pieces a paged Drizzle query needs, already assembled. The repository
 * that receives this combines `where` with its tenant scoping and runs the
 * page and count queries with the same pieces.
 */
export interface PagedQuery {
  where: SQL | undefined
  orderBy: SQL[]
  limit: number
  offset: number
}

/**
 * The columns a feature allows its clients to sort by, by the wire name the
 * sort clause carries — a table column, or a derived one a query selects
 * (a bill's computed total). A field missing here is never user input
 * reaching a column — the sort clause for it is dropped.
 */
export type SortableColumns = Record<string, SQLWrapper>

/**
 * Translates the shared `FetchArgs` envelope into Drizzle query pieces. This
 * is the only place that knows how paging and sorting cross from the wire
 * into a query; it knows nothing about any feature — the `filter` arrives
 * already translated to SQL by the caller.
 */
export function buildPagedQuery(
  args: FetchArgs,
  filter: SQL | undefined,
  sortableColumns: SortableColumns
): PagedQuery {
  const orderBy = args.sort
    .map((clause) => {
      const column = sortableColumns[clause.field]

      if (column === undefined) {
        // A field outside the whitelist is dropped, not rejected: the sort
        // is a preference, and rejecting the whole page for it would make
        // every new client field a breaking change.
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

/**
 * Escapes the characters a `LIKE` pattern treats specially, so a filter
 * value is always matched literally.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
