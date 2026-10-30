import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

export function centsToDecimalSql(expression: SQLWrapper): SQL<string> {
  return sql`(case when (${expression}) < 0 then '-' else '' end) || printf('%d.%02d', abs(${expression}) / 100, abs(${expression}) % 100)`
}
