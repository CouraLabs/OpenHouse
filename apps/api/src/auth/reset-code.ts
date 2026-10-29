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
  const bytes = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    // Rejection sampling keeps the draw uniform over the alphabet.
    const limit = 0xffffffff - (0xffffffff % RESET_CODE_ALPHABET.length)
    let draw = bytes[index]
    while (draw > limit) {
      crypto.getRandomValues(bytes.subarray(index, index + 1))
      ;[draw] = bytes.subarray(index, index + 1)
    }
    code += RESET_CODE_ALPHABET[draw % RESET_CODE_ALPHABET.length]
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

/** The SHA-256 (hex) of a code's normalized spelling — all that is stored.
 * WebCrypto, so it runs on Workers; the reset-code script on Node uses the
 * same platform API. */
export async function hashResetCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizeResetCode(code))
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compares two code hashes without short-circuiting on the first differing
 * character — the comparison runs over the whole pair whatever it reads.
 * The hashes are hex of a fixed length, so the length check is implied.
 */
export function hashesMatch(stored: string, presented: string): boolean {
  if (stored.length !== presented.length) {
    return false
  }

  let difference = 0
  for (let index = 0; index < stored.length; index += 1) {
    difference |= stored.charCodeAt(index) ^ presented.charCodeAt(index)
  }

  return difference === 0
}

/** The part of a normalized code the attempt limiter counts failures by. */
export function resetCodePrefix(normalized: string): string {
  return normalized.slice(0, PREFIX_LENGTH)
}
