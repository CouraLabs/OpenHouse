import type { Context } from 'hono'
import type { z, ZodType } from 'zod'

import { BadRequestError } from '../errors.js'

/**
 * Validates a request argument against a zod schema and answers the parsed
 * value — the replacement of the `ZodValidationPipe`. Parsing, not mere
 * validation: defaults are applied and the type a handler receives is the
 * schema's output type. A body that does not parse answers 400 with the
 * issue list, the same body the pipe threw.
 */
export async function parseJsonBody<S extends ZodType>(
  context: Context,
  schema: S
): Promise<z.output<S>> {
  const raw = await context.req.json().catch(() => undefined)
  const result = schema.safeParse(raw)

  if (!result.success) {
    throw new BadRequestError(result.error.issues)
  }

  return result.data
}

/** Validates the query string's parameters against a schema. */
export function parseQuery<S extends ZodType>(
  context: Context,
  schema: S
): z.output<S> {
  const result = schema.safeParse(context.req.query())

  if (!result.success) {
    throw new BadRequestError(result.error.issues)
  }

  return result.data
}
