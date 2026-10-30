import { expect, test } from '../../support/test.js'

import { loadOwnerAccount } from '../../support/owner.js'

test.describe('household', () => {
  test('the household page lists the owner as a member', async ({ page }) => {
    const owner = loadOwnerAccount()

    await test.step('Action: open Household', async () => {
      await page.goto('household')
    })

    await test.step('Expect: the page heading and the owner name are shown', async () => {
      await expect(page.getByRole('heading', { name: 'Household', exact: true })).toBeVisible()
      await expect(page.getByText(owner.name, { exact: true }).first()).toBeVisible()
    })
  })
})

test.describe('notifications', () => {
  test('the bell opens the notification centre', async ({ page }) => {
    await test.step('Action: open the dashboard and press the Notifications bell', async () => {
      await page.goto('')
      await page.getByRole('button', { name: 'Notifications' }).click()
    })

    await test.step('Expect: the notification centre region opens', async () => {
      await expect(page.getByRole('dialog').getByText('No notifications yet.')).toBeVisible()
    })
  })
})
