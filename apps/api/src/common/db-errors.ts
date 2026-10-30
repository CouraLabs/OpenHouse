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

export function isForeignKeyViolation(error: unknown): boolean {
  return constraintMessage(error, (message) =>
    message.includes('FOREIGN KEY constraint failed')
  )
}

export function isAnyUniqueViolation(error: unknown): boolean {
  return constraintMessage(error, (message) =>
    message.includes('UNIQUE constraint failed:')
  )
}

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
