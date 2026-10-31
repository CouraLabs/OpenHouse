export const startPages = [
  "/",
  "/transactions",
  "/recurring-transactions",
  "/transaction-linkers",
  "/accounts",
  "/categories",
  "/receivers",
  "/limits",
  "/goals",
  "/tips",
] as const

export type StartPage = (typeof startPages)[number]

export interface UserPreferences {
  startPage: StartPage
}
