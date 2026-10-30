import { z } from 'zod'

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

export function toStartPage(value: string): StartPage {
  return (startPages as readonly string[]).includes(value)
    ? (value as StartPage)
    : '/'
}

export const updatePreferencesSchema = z.object({
  startPage: startPageSchema,
})

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesSchema>

export interface UserPreferences {
  startPage: StartPage
}
