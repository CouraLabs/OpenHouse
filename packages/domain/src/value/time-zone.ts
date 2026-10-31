let knownTimeZones: ReadonlySet<string> | undefined

export const isSupportedTimeZone = (timeZone: string): boolean => {
  knownTimeZones ??= new Set(Intl.supportedValuesOf('timeZone'))

  return timeZone === 'UTC' || knownTimeZones.has(timeZone)
}
