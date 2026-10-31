export function goalGaugeColor(pct: number): string {
  const strength = Math.round(35 + (Math.min(pct, 100) / 100) * 65)

  return `color-mix(in oklab, var(--module-finance) ${strength}%, transparent)`
}
