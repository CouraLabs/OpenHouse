export const RESET_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const CODE_LENGTH = 10

const PREFIX_LENGTH = 5

export function generateResetCode(): string {
  const bytes = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let index = 0; index < CODE_LENGTH; index += 1) {
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

export function normalizeResetCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, '')
}

export function isWellFormedResetCode(normalized: string): boolean {
  return (
    normalized.length === CODE_LENGTH &&
    [...normalized].every((char) => RESET_CODE_ALPHABET.includes(char))
  )
}

export async function hashResetCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizeResetCode(code))
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

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

export function resetCodePrefix(normalized: string): string {
  return normalized.slice(0, PREFIX_LENGTH)
}
