import { expect, test } from '../../support/test.js'

test.describe('financial tips', () => {
  test('simple and compound interest use the default projection of 15,000.00 at 10% for 15 years', async ({ page }) => {
    await test.step('Action: open Simple vs Compound Interest with the default inputs', async () => {
      await page.goto('tips/interest-comparison')
    })

    await test.step('Expect: simple interest gives R$37,500.00 and compound interest gives R$62,658.72', async () => {
      await expect(page.getByRole('textbox', { name: 'Present value', exact: true })).toHaveValue('15,000.00')
      await expect(page.getByText('R$37,500.00').first()).toBeVisible()
      await expect(page.getByText('R$62,658.72').first()).toBeVisible()
      await expect(page.getByText('R$25,158.72').first()).toBeVisible()
    })
  })

  test('changing the rate and the period recalculates both capitals', async ({ page }) => {
    await test.step('Action: set the net return to 5% a year and the period to 10 years', async () => {
      await page.goto('tips/interest-comparison')
      await page.getByRole('textbox', { name: 'Net return rate (% a year)', exact: true }).fill('5')
      await page.getByRole('textbox', { name: 'Period', exact: true }).fill('10')
    })

    await test.step('Expect: simple capital is R$22,500.00 and compound capital is R$24,433.42', async () => {
      await expect(page.getByText('R$22,500.00').first()).toBeVisible()
      await expect(page.getByText('R$24,433.42').first()).toBeVisible()
    })
  })

  test('the buy-or-rent comparison shows totals for both paths', async ({ page }) => {
    await test.step('Action: open Buy or Rent with the default scenario', async () => {
      await page.goto('tips/rent-vs-buy')
    })

    await test.step('Expect: the buying and renting totals are both shown', async () => {
      await expect(page.getByText('Paid in interest')).toBeVisible()
      await expect(page.getByText('Paid in rent')).toBeVisible()
      await expect(page.getByText('Patrimony over time')).toBeVisible()
    })
  })
})
