import { expect, test } from '../../support/test.js'

import { chooseOption } from '../../support/pick.js'
import { uniqueName } from '../../support/names.js'
import { seedCategory } from '../../support/seed.js'

test.describe('transaction linkers', () => {
  test('a linker maps a bank description to a category', async ({ page, request }) => {
    const category = await seedCategory(request)
    const description = uniqueName('PADARIA SAO JOAO')

    await test.step('Action: open Transaction Linkers and create a linker for the description', async () => {
      await page.goto('transaction-linkers')
      await page.getByRole('button', { name: 'New linker' }).click()
      await page.getByRole('textbox', { name: 'Description', exact: true }).fill(description)
      await chooseOption(page, 'Category', category.name)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the linker is listed with its description and category', async () => {
      const row = page.getByRole('row').filter({ hasText: description })
      await expect(row).toBeVisible()
      await expect(row).toContainText(category.name)
    })
  })

  test('a linker without a description is refused', async ({ page, request }) => {
    const category = await seedCategory(request)

    await test.step('Action: save a linker with only a category', async () => {
      await page.goto('transaction-linkers')
      await page.getByRole('button', { name: 'New linker' }).click()
      await chooseOption(page, 'Category', category.name)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Enter a description." is shown', async () => {
      await expect(page.getByText('Enter a description.')).toBeVisible()
    })
  })
})
