import type { Context } from 'hono'
import type { z, ZodType } from 'zod'

import { BadRequestError } from '@workspace/business'

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
