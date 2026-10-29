/**
 * Maps the SQLite/D1 errors the repositories depend on to the domain errors
 * the API answers. Postgres exposed stable SQLSTATE codes (`23505` unique,
 * `23503` foreign key); SQLite and D1 surface the constraint in the error
 * *message* instead, so the detection reads the message text:
 *
 * - `UNIQUE constraint failed: tenants.name` — a uniqueness rule the
 *   service surfaces as a friendly 409 (sign-up's tenant name taken, an
 *   email already used, a recurring day already materialized);
 * - `FOREIGN KEY constraint failed` — a referenced row is gone.
 *
 * The message check works against both drivers the app runs on: the real
 * D1 binding (workerd) and the local `node:sqlite` stand-in, which both
 * pass SQLite's message through unchanged.
 */

/**
 * Whether the error is a uniqueness violation. The message names either the
 * columns (`UNIQUE constraint failed: table.col1, table.col2`) or — for an
 * expression or partial index — the index
 * (`UNIQUE constraint failed: index 'name'`).
 */
export function isUniqueViolation(
  error: unknown,
  table: string,
  columns?: readonly string[]
): boolean {
  return constraintMessage(error, (message) => {
    if (!message.includes('UNIQUE constraint failed:')) {
      return false
    }

    const indexName = /index '([^']+)'/.exec(message)?.[1]
    if (indexName !== undefined) {
      // The caller names the index when it cares which one spoke.
      return columns === undefined || columns.some((column) => indexName.includes(column))
    }

    if (!message.includes(`UNIQUE constraint failed: ${table}.`)) {
      return false
    }

    if (columns === undefined) {
      return true
    }

    const listed = message
      .slice(message.indexOf(':') + 1)
      .split(',')
      .map((column) => column.trim())

    return columns.every((column) => listed.includes(`${table}.${column}`))
  })
}

/** Whether the error is a foreign-key violation. */
export function isForeignKeyViolation(error: unknown): boolean {
  return constraintMessage(error, (message) =>
    message.includes('FOREIGN KEY constraint failed')
  )
}

/** Whether the error is a uniqueness violation on any table. */
export function isAnyUniqueViolation(error: unknown): boolean {
  return constraintMessage(error, (message) =>
    message.includes('UNIQUE constraint failed:')
  )
}

/**
 * Reads the error a failed query carries. Drizzle wraps the driver error in
 * a `DrizzleQueryError` with the cause chain; both the wrapper and the
 * driver can carry the message.
 */
function constraintMessage(
  error: unknown,
  matches: (message: string) => boolean
): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause]

  return candidates.some(
    (candidate) =>
      typeof (candidate as { message?: unknown } | null)?.message ===
        'string' && matches((candidate as { message: string }).message)
  )
}

/**
 * Answers `fallback()` when the error is a uniqueness violation — the shape
 * every "the constraint is the check" write uses (a recurring day already
 * materialized, a claim already taken). The error rethrows otherwise.
 */
export function onUniqueViolation<T>(
  error: unknown,
  fallback: () => T,
  table?: string,
  columns?: readonly string[]
): T {
  if (
    table === undefined
      ? isAnyUniqueViolation(error)
      : isUniqueViolation(error, table, columns)
  ) {
    return fallback()
  }

  throw error
}
