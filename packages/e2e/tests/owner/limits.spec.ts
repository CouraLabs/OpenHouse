import { expect, test } from '../../support/test.js'

import { chooseOption } from '../../support/pick.js'
import { seedCategory } from '../../support/seed.js'

test.describe('limits', () => {
  test('a monthly limit is set on a category and listed with its amount', async ({ page, request }) => {
    const category = await seedCategory(request)

    await test.step('Action: open Limits and start a new limit', async () => {
      await page.goto('limits')
      await page.getByRole('button', { name: 'New limit' }).click()
    })

    await test.step('Action: pick the category and the Monthly period and enter 500.00', async () => {
      await chooseOption(page, 'Category', category.name)
      await chooseOption(page, 'Type', 'Monthly')
      await page.getByRole('textbox', { name: /^Amount/ }).fill('500.00')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the limit is listed with the category, the period and the amount', async () => {
      await expect(page.getByText(category.name, { exact: true }).first()).toBeVisible()
      await expect(page.getByText('Monthly', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('R$0.00 / R$500.00').first()).toBeVisible()
    })
  })

  test('a limit without a category is refused', async ({ page }) => {
    await test.step('Action: open New limit and save with only an amount and period', async () => {
      await page.goto('limits')
      await page.getByRole('button', { name: 'New limit' }).click()
      await chooseOption(page, 'Type', 'Weekly')
      await page.getByRole('textbox', { name: /^Amount/ }).fill('80.00')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Pick a category." is shown and the form stays', async () => {
      await expect(page.getByText('Pick a category.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    })
  })

  test('the limit currency label follows the household main currency', async ({ page }) => {
    await test.step('Action: open New limit', async () => {
      await page.goto('limits')
      await page.getByRole('button', { name: 'New limit' }).click()
    })

    await test.step('Expect: the amount field is labelled with BRL, the main currency', async () => {
      await expect(page.getByRole('textbox', { name: 'Amount (BRL)', exact: true })).toBeVisible()
    })
  })
})
