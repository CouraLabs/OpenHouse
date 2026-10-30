import { expect, test } from '../../support/test.js'

import { chooseOption } from '../../support/pick.js'
import { seedAccount, seedCategory, seedReceiver } from '../../support/seed.js'

test.describe('recurring transactions', () => {
  test('a monthly expense rule is saved and listed with its frequency', async ({ page, request }) => {
    const receiver = await seedReceiver(request)
    const category = await seedCategory(request)
    const account = await seedAccount(request)

    await test.step('Action: open Recurring Transactions and start a new rule', async () => {
      await page.goto('recurring-transactions')
      await page.getByRole('button', { name: 'New recurring rule' }).click()
      await expect(page.getByRole('combobox', { name: 'Receiver', exact: true })).toBeVisible()
    })

    await test.step('Action: fill a monthly expense of 89.90 to the receiver', async () => {
      await chooseOption(page, 'Receiver', receiver.name)
      await chooseOption(page, 'Category', category.name)
      await chooseOption(page, 'Account', account.name)
      await page.getByRole('textbox', { name: 'Amount', exact: true }).fill('89.90')
      await page.getByRole('radiogroup').getByRole('radio').nth(1).check()
      await chooseOption(page, 'Frequency', 'Monthly')
      await chooseOption(page, 'Day', '15')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the rule is listed with the receiver, amount and Monthly frequency', async () => {
      const row = page.getByRole('row').filter({ hasText: receiver.name })
      await expect(row).toBeVisible()
      await expect(row).toContainText('89.90')
      await expect(row).toContainText('Monthly')
    })
  })

  test('a rule without a receiver is refused', async ({ page, request }) => {
    const category = await seedCategory(request)
    const account = await seedAccount(request)

    await test.step('Action: save a rule with category, account and amount but no receiver', async () => {
      await page.goto('recurring-transactions')
      await page.getByRole('button', { name: 'New recurring rule' }).click()
      await chooseOption(page, 'Category', category.name)
      await chooseOption(page, 'Account', account.name)
      await page.getByRole('textbox', { name: 'Amount', exact: true }).fill('20.00')
      await chooseOption(page, 'Frequency', 'Weekly')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Pick a receiver." is shown and the form stays', async () => {
      await expect(page.getByText('Pick a receiver.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    })
  })
})
