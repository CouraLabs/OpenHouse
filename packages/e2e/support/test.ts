import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'
export type { Locator, Page, APIRequestContext } from '@playwright/test'

const PACE_MS = Number(process.env.E2E_PACE_MS ?? 2500)

export const test = base.extend<{ paced: undefined }>({
  paced: [
    async ({}, use) => {
      await use(undefined)
      await new Promise((resolve) => setTimeout(resolve, PACE_MS))
    },
    { auto: true },
  ],
})
