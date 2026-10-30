import { expect, test as setup } from '@playwright/test'

import { apiPost } from '../../support/api.js'
import { saveSignInAccount, type OwnerAccount } from '../../support/owner.js'
import { uniqueEmail, uniqueName } from '../../support/names.js'

setup('signs up a separate household for the sign-in tests', async ({ page }) => {
  const account: OwnerAccount = {
    household: uniqueName('E2E Sign-in Household'),
    name: 'E2E Sign-in Owner',
    email: uniqueEmail('e2e-sign-in'),
    password: 'e2e-sign-in-pass',
  }

  await apiPost(page.request, '/auth/sign-up', {
    tenantName: account.household,
    name: account.name,
    email: account.email,
    password: account.password,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
  })

  await page.goto('')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  saveSignInAccount(account)
})
