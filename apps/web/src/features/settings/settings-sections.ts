import type { SessionUser } from '@workspace/poco'

/** The sections of the Settings page, in navigation order. */
export const settingsSections = [
  'general',
  'users',
  'preferences',
  'security',
] as const

export type SettingsSection = (typeof settingsSections)[number]

/**
 * The sections a role may open. A member only manages their own
 * preferences and password; the tenant-wide sections are the owner's, and
 * the API refuses them too.
 */
export function sectionsFor(role: SessionUser['role']): SettingsSection[] {
  return role === 'owner' ? [...settingsSections] : ['preferences', 'security']
}

/** Whether a URL segment names a section the role may open. */
export function isSectionFor(
  role: SessionUser['role'],
  section: string
): section is SettingsSection {
  return (sectionsFor(role) as string[]).includes(section)
}
