import { expect, test } from '../../support/test.js'

import { chooseOption } from '../../support/pick.js'
import { uniqueName } from '../../support/names.js'
import { seedAccount } from '../../support/seed.js'

test.describe('goals', () => {
  test('a goal on a savings account shows its balance against the target', async ({ page, request }) => {
    const savings = await seedAccount(request, { type: 'Savings', currency: 'BRL', balance: '300.00' })
    const name = uniqueName('QA Emergency Fund')

    await test.step('Action: open Goals and start a new goal', async () => {
      await page.goto('goals')
      await page.getByRole('button', { name: 'New goal' }).click()
    })

    await test.step('Action: name the goal, pick the savings account and set the target balance to 1,000.00', async () => {
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseOption(page, 'Account', savings.name)
      await page.getByRole('textbox', { name: 'Balance (BRL)', exact: true }).fill('300.00')
      await page.getByRole('textbox', { name: 'Target balance (BRL)', exact: true }).fill('1000.00')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the goal is listed with the account, its balance and the target', async () => {
      const row = page.getByRole('row').filter({ hasText: name })
      await expect(row).toBeVisible()
      await expect(row).toContainText(savings.name)
      await expect(row).toContainText('300.00')
      await expect(row).toContainText('1,000.00')
    })
  })

  test('a goal without an account is refused', async ({ page }) => {
    await test.step('Action: save a goal with a name and target only', async () => {
      await page.goto('goals')
      await page.getByRole('button', { name: 'New goal' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(uniqueName('QA No Account Goal'))
      await page.getByRole('textbox', { name: 'Target balance (BRL)', exact: true }).fill('500.00')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Pick an account." is shown and the form stays', async () => {
      await expect(page.getByText('Pick an account.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    })
  })
})
