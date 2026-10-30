import { expect, test } from '../../support/test.js'

import { uniqueName } from '../../support/names.js'
import { seedAccount } from '../../support/seed.js'

const destinations: Array<{ path: string; heading: string }> = [
  { path: 'categories', heading: 'Categories' },
  { path: 'limits', heading: 'Limits' },
  { path: 'goals', heading: 'Goals' },
  { path: 'household', heading: 'Household' },
  { path: 'accounts', heading: 'Accounts' },
  { path: 'transactions', heading: 'Transactions' },
  { path: 'bills', heading: 'Bills' },
  { path: 'receivers', heading: 'Receivers' },
  { path: 'transaction-linkers', heading: 'Transaction Linkers' },
  { path: 'recurring-transactions', heading: 'Recurring Transactions' },
  { path: 'upcoming', heading: 'Upcoming' },
  { path: 'tips', heading: 'Financial Tips' },
  { path: 'tips/interest-comparison', heading: 'Simple vs Compound Interest' },
  { path: 'tips/rate-conversion', heading: 'Rate Conversion' },
  { path: 'tips/financial-independence', heading: 'Financial Independence' },
  { path: 'tips/rent-vs-buy', heading: 'Buy or Rent' },
  { path: 'settings', heading: 'Settings' },
]

test.describe('navigation', () => {
  for (const destination of destinations) {
    test(`/${destination.path} opens with the "${destination.heading}" heading`, async ({ page }) => {
      await test.step(`Action: open /${destination.path}`, async () => {
        await page.goto(destination.path)
      })

      await test.step(`Expect: the level-1 heading reads "${destination.heading}"`, async () => {
        await expect(page.getByRole('heading', { level: 1, name: destination.heading, exact: true })).toBeVisible()
        await expect(page).toHaveURL(new RegExp(`/app/${destination.path}$`))
      })
    })
  }

  test('the sidebar opens Accounts from the dashboard', async ({ page }) => {
    await test.step('Action: open the dashboard and follow the Accounts link in the sidebar', async () => {
      await page.goto('')
      await page.getByRole('link', { name: 'Accounts', exact: true }).click()
    })

    await test.step('Expect: the Accounts page opens and the URL changes', async () => {
      await expect(page).toHaveURL(/\/app\/accounts$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Accounts', exact: true })).toBeVisible()
    })
  })

  test('an unknown address shows the not-found message', async ({ page }) => {
    await test.step('Action: open an address that does not exist', async () => {
      await page.goto(`no-such-page-${Date.now().toString(36)}`)
    })

    await test.step('Expect: "Nothing here." is shown', async () => {
      await expect(page.getByText('Nothing here.')).toBeVisible()
    })
  })
})

test.describe('dashboard', () => {
  test('a new account appears in the Balances card with its balance', async ({ page, request }) => {
    const account = await seedAccount(request, { name: uniqueName('QA Dashboard Account'), balance: '321.00' })

    await test.step('Action: open the dashboard', async () => {
      await page.goto('')
    })

    await test.step('Expect: the account name and its balance appear on the dashboard', async () => {
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
      await expect(page.getByText(account.name, { exact: true }).first()).toBeVisible()
      await expect(page.getByText('R$321.00').first()).toBeVisible()
    })
  })
})
