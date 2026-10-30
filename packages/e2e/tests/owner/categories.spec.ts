import { expect, test } from '../../support/test.js'

import { filterByName } from '../../support/filters.js'
import { uniqueName } from '../../support/names.js'

test.describe('categories', () => {
  test('a category is created with a name and a color and listed', async ({ page }) => {
    const name = uniqueName('QA Groceries')

    await test.step('Action: open Categories and create a category named for the test', async () => {
      await page.goto('categories')
      await page.getByRole('button', { name: 'New category' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the form closes and the new category is in the table', async () => {
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
      await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
    })
  })

  test('a category without a name is refused', async ({ page }) => {
    await test.step('Action: open New category and save with the name empty', async () => {
      await page.goto('categories')
      await page.getByRole('button', { name: 'New category' }).click()
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the form stays open and asks for a name', async () => {
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
      await expect(page.getByText('Name is required.')).toBeVisible()
    })
  })

  test('the filter narrows the list to matching names', async ({ page }) => {
    const token = uniqueName('QA Filter').replace(/\s/g, '')
    const match = `${token} Match`
    const other = `${token} Other`

    await test.step('Precondition: create two categories that share a prefix', async () => {
      for (const name of [match, other]) {
        await page.goto('categories')
        await page.getByRole('button', { name: 'New category' }).click()
        await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
      }
    })

    await test.step('Action: type the full name of the first category into the filter', async () => {
      await filterByName(page, match)
    })

    await test.step('Expect: only the matching category remains listed', async () => {
      await expect(page.getByRole('row').filter({ hasText: match })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: other })).toHaveCount(0)
    })
  })

  test('editing a category renames it', async ({ page }) => {
    const original = uniqueName('QA Old Category')
    const renamed = uniqueName('QA New Category')

    await test.step('Precondition: create a category to edit', async () => {
      await page.goto('categories')
      await page.getByRole('button', { name: 'New category' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(original)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('row').filter({ hasText: original })).toBeVisible()
    })

    await test.step('Action: press Edit on the row, change the name and save', async () => {
      await page.getByRole('row').filter({ hasText: original }).getByRole('button', { name: 'Edit' }).click()
      await expect(page.getByText('Edit category', { exact: true })).toBeVisible()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(renamed)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the table shows the new name and not the old one', async () => {
      await expect(page.getByRole('row').filter({ hasText: renamed })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: original })).toHaveCount(0)
    })
  })

  test('deleting a category asks for confirmation and removes it', async ({ page }) => {
    const name = uniqueName('QA Trash Category')

    await test.step('Precondition: create a category to delete', async () => {
      await page.goto('categories')
      await page.getByRole('button', { name: 'New category' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
    })

    await test.step('Action: press Delete on the row and confirm', async () => {
      await page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: 'Delete' }).click()
      await expect(page.getByText('Delete category?')).toBeVisible()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
    })

    await test.step('Expect: the category is gone from the table', async () => {
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0)
    })
  })
})
