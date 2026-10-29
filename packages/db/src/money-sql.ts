import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

/**
 * SQL helpers for the integer-cents storage.
 *
 * Money columns hold integer minor units (rule 6b); raw SQL aggregates over
 * them stay integer-exact, and this is the one place that formats the cents
 * back into the two-decimal string the wire carries — integer arithmetic in
 * `printf`, never a float.
 *
 * Applied to a **materialized column** (a CTE select) the expression is a
 * plain reference and evaluates once. Wrapped directly around an aggregate
 * (`sum(...)`) the references share SQLite's single accumulator, which is
 * exact but should be avoided over window functions: materialize the window
 * into a CTE first, then format its column.
 */

/** Formats an integer-cents expression as `"12.34"` / `"-0.01"` / `"0.00"`. */
export function centsToDecimalSql(expression: SQLWrapper): SQL<string> {
  return sql`(case when (${expression}) < 0 then '-' else '' end) || printf('%d.%02d', abs(${expression}) / 100, abs(${expression}) % 100)`
}
