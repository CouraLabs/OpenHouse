import { expect, test } from '../../support/test.js'

import { uniqueName } from '../../support/names.js'
import { seedCategory, seedCreditCard, seedExpense } from '../../support/seed.js'

test.describe('bills', () => {
  test('a card purchase opens a bill for that card with its total', async ({ page, request }) => {
    const card = await seedCreditCard(request, { name: uniqueName('QA Bill Card') })
    const category = await seedCategory(request)

    await test.step('Precondition: seed a 260.00 purchase on the card', async () => {
      await seedExpense(request, { name: uniqueName('QA Bill Charge'), amount: '260.00', accountId: card.id, categoryId: category.id })
    })

    await test.step('Action: open Bills filtered to this card', async () => {
      await page.goto(`bills?accountId=${card.id}`)
    })

    await test.step('Expect: one bill is listed with the 260.00 total', async () => {
      const row = page.getByRole('row').filter({ hasText: '260.00' })
      await expect(row).toHaveCount(1)
    })
  })

  test('the Bills page is empty for a card with no charges', async ({ page, request }) => {
    const card = await seedCreditCard(request, { name: uniqueName('QA Empty Card') })

    await test.step('Action: open Bills filtered to a card that has never been used', async () => {
      await page.goto(`bills?accountId=${card.id}`)
    })

    await test.step('Expect: the empty-state line explains how a bill starts', async () => {
      await expect(page.getByText("No bills yet. A card's first charge opens its bill.")).toBeVisible()
    })
  })
})
