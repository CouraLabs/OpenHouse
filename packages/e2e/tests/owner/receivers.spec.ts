import { expect, test } from '../../support/test.js'

import { chooseOption } from '../../support/pick.js'
import { filterByName } from '../../support/filters.js'
import { uniqueName } from '../../support/names.js'

test.describe('receivers', () => {
  test('a receiver is created with a name and a type and listed', async ({ page }) => {
    const name = uniqueName('QA City Power')

    await test.step('Action: open Receivers, start a new receiver and pick the Service type', async () => {
      await page.goto('receivers')
      await page.getByRole('button', { name: 'New receiver' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseOption(page, 'Type', 'Service')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the receiver is listed with the Service type', async () => {
      const row = page.getByRole('row').filter({ hasText: name })
      await expect(row).toBeVisible()
      await expect(row).toContainText('Service')
    })
  })

  test('a receiver without a name is refused', async ({ page }) => {
    await test.step('Action: save a receiver with only a type', async () => {
      await page.goto('receivers')
      await page.getByRole('button', { name: 'New receiver' }).click()
      await chooseOption(page, 'Type', 'Person')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Enter a name." is shown', async () => {
      await expect(page.getByText('Enter a name.')).toBeVisible()
    })
  })

  test('the name filter narrows the receivers list', async ({ page }) => {
    const token = uniqueName('QA Filter Rcv').replace(/\s/g, '')
    const match = `${token} Match`
    const other = `${token} Other`

    await test.step('Precondition: create two receivers that share a prefix', async () => {
      for (const name of [match, other]) {
        await page.goto('receivers')
        await page.getByRole('button', { name: 'New receiver' }).click()
        await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
        await chooseOption(page, 'Type', 'Merchant')
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
      }
    })

    await test.step('Action: type the full name of the first receiver into the filter', async () => {
      await filterByName(page, match)
    })

    await test.step('Expect: only the matching receiver remains listed', async () => {
      await expect(page.getByRole('row').filter({ hasText: match })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: other })).toHaveCount(0)
    })
  })
})
