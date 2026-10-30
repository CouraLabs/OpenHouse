import { expect, test as setup } from '@playwright/test'

import { apiPost } from '../../support/api.js'
import { AUTH_FILE, saveOwnerAccount, type OwnerAccount } from '../../support/owner.js'
import { uniqueEmail, uniqueName } from '../../support/names.js'

setup('signs up the shared owner household in BRL', async ({ page }) => {
  const owner: OwnerAccount = {
    household: uniqueName('E2E Household'),
    name: 'E2E Owner',
    email: uniqueEmail('e2e-owner'),
    password: 'e2e-owner-pass',
  }

  await apiPost(page.request, '/auth/sign-up', {
    tenantName: owner.household,
    name: owner.name,
    email: owner.email,
    password: owner.password,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
  })

  await page.goto('')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.context().storageState({ path: AUTH_FILE })
  saveOwnerAccount(owner)
})
