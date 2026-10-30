import type { Page } from '@playwright/test'

import type { OwnerAccount } from './owner.js'

export async function signUpThroughForm(page: Page, owner: OwnerAccount): Promise<void> {
  await page.goto('sign-up')
  await page.getByRole('radio', { name: 'Start a new household' }).click()
  await page.getByLabel('Household name').fill(owner.household)
  await page.getByLabel('Your name').fill(owner.name)
  await page.getByLabel('Email').fill(owner.email)
  await page.getByLabel('Password').fill(owner.password)
  await page.getByRole('button', { name: 'Sign up' }).click()
}
