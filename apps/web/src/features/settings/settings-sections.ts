import type { SessionUser } from '@workspace/poco'

export const settingsSections = [
  'general',
  'plan',
  'users',
  'data',
  'preferences',
  'security',
] as const

export type SettingsSection = (typeof settingsSections)[number]

export function sectionsFor(role: SessionUser['role']): SettingsSection[] {
  return role === 'owner' ? [...settingsSections] : ['preferences', 'security']
}

export function isSectionFor(
  role: SessionUser['role'],
  section: string
): section is SettingsSection {
  return (sectionsFor(role) as string[]).includes(section)
}
