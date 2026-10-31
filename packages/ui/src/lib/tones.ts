export type Tone =
  | 'primary'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'in'
  | 'out'
  | 'blue'
  | 'pink'
  | 'olive'
  | 'slate'
  | 'orange'

export const toneTile: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  positive: 'bg-positive-soft text-positive',
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-muted-foreground',
  in: 'bg-[color-mix(in_oklab,var(--data-in)_20%,transparent)] text-[color-mix(in_oklab,var(--data-in)_62%,var(--foreground))]',
  out: 'bg-[color-mix(in_oklab,var(--data-out)_24%,transparent)] text-[color-mix(in_oklab,var(--data-out)_58%,var(--foreground))]',
  blue: 'bg-[color-mix(in_oklab,var(--data-blue)_20%,transparent)] text-[color-mix(in_oklab,var(--data-blue)_62%,var(--foreground))]',
  pink: 'bg-[color-mix(in_oklab,var(--data-pink)_20%,transparent)] text-[color-mix(in_oklab,var(--data-pink)_60%,var(--foreground))]',
  olive:
    'bg-[color-mix(in_oklab,var(--data-olive)_20%,transparent)] text-[color-mix(in_oklab,var(--data-olive)_62%,var(--foreground))]',
  slate:
    'bg-[color-mix(in_oklab,var(--data-slate)_18%,transparent)] text-[color-mix(in_oklab,var(--data-slate)_70%,var(--foreground))]',
  orange:
    'bg-[color-mix(in_oklab,var(--data-orange)_22%,transparent)] text-[color-mix(in_oklab,var(--data-orange)_58%,var(--foreground))]',
}

export const toneFill: Record<Tone, string> = {
  primary: 'var(--primary)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  neutral: 'var(--muted-foreground)',
  in: 'var(--data-in)',
  out: 'var(--data-out)',
  blue: 'var(--data-blue)',
  pink: 'var(--data-pink)',
  olive: 'var(--data-olive)',
  slate: 'var(--data-slate)',
  orange: 'var(--data-orange)',
}

const pastels = [
  'bg-pastel-pink',
  'bg-pastel-sage',
  'bg-pastel-blue',
  'bg-pastel-peach',
  'bg-pastel-butter',
] as const

export function pastelFor(name: string): string {
  let hash = 0

  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  return pastels[Math.abs(hash) % pastels.length] ?? pastels[0]
}
