import { BadRequestException, PipeTransform } from '@nestjs/common'
import type { z, ZodType } from 'zod'

/**
 * Validates a handler argument against a zod schema and passes the parsed
 * value on. Parsing, not mere validation: defaults are applied and the type
 * a controller receives is the schema's output type.
 */
export class ZodValidationPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException(result.error.issues)
    }

    return result.data
  }
}
