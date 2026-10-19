import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * The characters a reset code is drawn from: digits and uppercase letters
 * without the ones a person misreads — no `0`/`O`, no `1`/`I`/`L`. Codes are
 * read aloud and retyped, so every character must survive that.
 */
export const RESET_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Characters in a code, before the hyphen that splits it in two. */
const CODE_LENGTH = 10

/** The characters the attempt limiter groups failures by. */
const PREFIX_LENGTH = 5

/**
 * A fresh code, `XXXXX-XXXXX`, from the CSPRNG. 31^10 is about 2^49
 * codes: far beyond guessing within the reset route's throttle.
 */
export function generateResetCode(): string {
  let code = ''
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += RESET_CODE_ALPHABET[randomInt(RESET_CODE_ALPHABET.length)]
  }

  return `${code.slice(0, PREFIX_LENGTH)}-${code.slice(PREFIX_LENGTH)}`
}

/**
 * The one spelling a code is hashed in: uppercase, without the hyphen or
 * any whitespace — `abcde-fghjk ` and `ABCDEFGHJK` are the same code.
 */
export function normalizeResetCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, '')
}

/** Whether a normalized code has the shape a generated one does. */
export function isWellFormedResetCode(normalized: string): boolean {
  return (
    normalized.length === CODE_LENGTH &&
    [...normalized].every((char) => RESET_CODE_ALPHABET.includes(char))
  )
}

/** The SHA-256 (hex) of a code's normalized spelling — all that is stored. */
export function hashResetCode(code: string): string {
  return createHash('sha256').update(normalizeResetCode(code)).digest('hex')
}

/** Compares two code hashes in constant time. */
export function hashesMatch(stored: string, presented: string): boolean {
  const left = Buffer.from(stored, 'hex')
  const right = Buffer.from(presented, 'hex')

  return left.length === right.length && timingSafeEqual(left, right)
}

/** The part of a normalized code the attempt limiter counts failures by. */
export function resetCodePrefix(normalized: string): string {
  return normalized.slice(0, PREFIX_LENGTH)
}
