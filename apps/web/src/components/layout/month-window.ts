export function monthWindow(day: string): { from: string; to: string } {
  const [year, month] = day.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const prefix = day.slice(0, 8)

  return {
    from: `${prefix}01`,
    to: `${prefix}${String(lastDay).padStart(2, '0')}`,
  }
}
