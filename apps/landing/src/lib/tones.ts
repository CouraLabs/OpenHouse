import type { Tone } from './content.js'

/**
 * Each pastel as a wash plus the ink that reads on it. Spelled out in full so
 * Tailwind sees every class name at build time.
 */
export const toneClasses: Record<Tone, string> = {
  red: 'bg-red-wash text-red-ink',
  blue: 'bg-blue-wash text-blue-ink',
  green: 'bg-green-wash text-green-ink',
  yellow: 'bg-yellow-wash text-yellow-ink',
}
