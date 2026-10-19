import { z } from 'zod'

/**
 * The signed-in user's own preferences — unlike the tenant settings, every
 * user, owner or member, reads and writes their own.
 */

/** The pages a user may open on after signing in, as web route paths.
 * `/` is the home page and the default. */
export const startPages = [
  '/',
  '/transactions',
  '/recurring-transactions',
  '/transaction-linkers',
  '/accounts',
  '/categories',
  '/receivers',
  '/limits',
  '/goals',
  '/tips',
] as const

export type StartPage = (typeof startPages)[number]

export const startPageSchema = z.enum(startPages, {
  error: 'Pick a page.',
})

/** Reads a stored start page; a path no longer offered falls back to home. */
export function toStartPage(value: string): StartPage {
  return (startPages as readonly string[]).includes(value)
    ? (value as StartPage)
    : '/'
}

/** The body `PUT preferences` accepts. */
export const updatePreferencesSchema = z.object({
  startPage: startPageSchema,
})

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesSchema>

/** The preferences as `PUT preferences` and the session user carry them. */
export interface UserPreferences {
  startPage: StartPage
}
