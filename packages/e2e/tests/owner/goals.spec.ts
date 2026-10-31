import { expect, test } from '../../support/test.js'

import { chooseOption } from '../../support/pick.js'
import { uniqueName } from '../../support/names.js'
import { seedAccount, seedCategory, seedGoal, seedIncome } from '../../support/seed.js'

test.describe('goals', () => {
  test('a goal on a savings account shows the account balance against the target', async ({ page, request }) => {
    const savings = await seedAccount(request, { type: 'Savings', currency: 'BRL', balance: '300.00' })
    const name = uniqueName('QA Emergency Fund')

    await test.step('Action: open Goals and start a new goal', async () => {
      await page.goto('goals')
      await page.getByRole('button', { name: 'New goal' }).click()
    })

    await test.step('Expect: the form has no balance field, the progress comes from the account', async () => {
      await expect(page.getByRole('textbox', { name: 'Balance (BRL)', exact: true })).toHaveCount(0)
    })

    await test.step('Action: name the goal, pick the savings account and set the target balance to 1,000.00', async () => {
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseOption(page, 'Account', savings.name)
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

  test('the dashboard gauge follows the linked account as money moves into it', async ({ page, request }) => {
    const savings = await seedAccount(request, { type: 'Savings', currency: 'BRL', balance: '300.00' })
    const category = await seedCategory(request)
    const name = uniqueName('QA Gauge Goal')

    await test.step('Precondition: a 1,000.00 goal on the savings account', async () => {
      await seedGoal(request, { name, accountId: savings.id, targetBalance: '1000.00' })
    })

    await test.step('Action: deposit 200.00 into the savings account', async () => {
      await seedIncome(request, {
        name: uniqueName('QA Deposit'),
        amount: '200.00',
        accountId: savings.id,
        categoryId: category.id,
      })
    })

    await test.step('Expect: the dashboard gauge reads 500.00 of 1,000.00', async () => {
      await page.goto('')
      const gauge = page.getByRole('progressbar', { name: `Progress toward ${name}` })
      await expect(gauge).toHaveAttribute('aria-valuenow', '500')
      await expect(gauge).toContainText('500.00')
      await expect(gauge).toContainText('1,000.00')
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
