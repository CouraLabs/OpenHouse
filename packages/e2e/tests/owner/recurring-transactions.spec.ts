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

    await test.step('Action: fill a monthly expense of 89.90 to the receiver on day 15', async () => {
      await chooseOption(page, 'Receiver', receiver.name)
      await chooseOption(page, 'Category', category.name)
      await chooseOption(page, 'Account', account.name)
      await page.getByRole('textbox', { name: 'Amount', exact: true }).fill('89.90')
      await page.getByRole('radiogroup').getByRole('radio').nth(1).check()
      await chooseOption(page, 'Frequency', 'Monthly')
      await page.getByRole('textbox', { name: 'Day', exact: true }).fill('15')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the rule is listed with the receiver, amount and Monthly frequency', async () => {
      const row = page.getByRole('row').filter({ hasText: receiver.name })
      await expect(row).toBeVisible()
      await expect(row).toContainText('89.90')
      await expect(row).toContainText('Every month on day 15')
    })
  })

  test('a monthly rule on the 31st is set by typing the day', async ({ page, request }) => {
    const receiver = await seedReceiver(request)
    const category = await seedCategory(request)
    const account = await seedAccount(request)

    await test.step('Action: open a new rule and pick Monthly', async () => {
      await page.goto('recurring-transactions')
      await page.getByRole('button', { name: 'New recurring rule' }).click()
      await chooseOption(page, 'Receiver', receiver.name)
      await chooseOption(page, 'Category', category.name)
      await chooseOption(page, 'Account', account.name)
      await page.getByRole('textbox', { name: 'Amount', exact: true }).fill('45.00')
      await page.getByRole('radiogroup').getByRole('radio').nth(1).check()
      await chooseOption(page, 'Frequency', 'Monthly')
    })

    await test.step('Action: type 32, which is not a day of the month', async () => {
      await page.getByRole('textbox', { name: 'Day', exact: true }).fill('32')
    })

    await test.step('Expect: the Day field stays empty', async () => {
      await expect(page.getByRole('textbox', { name: 'Day', exact: true })).toHaveValue('')
    })

    await test.step('Action: type 31 into the Day field', async () => {
      await page.getByRole('textbox', { name: 'Day', exact: true }).fill('31')
    })

    await test.step('Expect: the Day field holds 31 and the schedule reads on day 31', async () => {
      await expect(page.getByRole('textbox', { name: 'Day', exact: true })).toHaveValue('31')
      await expect(page.getByText('Every month on day 31')).toBeVisible()
    })

    await test.step('Action: save the rule', async () => {
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the rule is listed on day 31', async () => {
      const row = page.getByRole('row').filter({ hasText: receiver.name })
      await expect(row).toContainText('Every month on day 31')
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
