import type { ZodError } from 'zod'

export type FieldErrors = Record<string, { message: string } | undefined>

export function fieldErrorsOf(error: ZodError): FieldErrors {
  const errors: FieldErrors = {}

  for (const issue of error.issues) {
    const [field] = issue.path

    if (typeof field === 'string' && errors[field] === undefined) {
      errors[field] = { message: issue.message }
    }
  }

  return errors
}
