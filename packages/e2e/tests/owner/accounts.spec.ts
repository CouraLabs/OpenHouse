import { expect, test } from '../../support/test.js'
import type { Page } from '../../support/test.js'

import { chooseOption, chooseRadio, currencyOption } from '../../support/pick.js'
import { uniqueName } from '../../support/names.js'

test.describe('accounts', () => {
  test('a checking account is created with its bank details and balance', async ({ page }) => {
    const name = uniqueName('QA Checking')

    await test.step('Action: open Accounts and start a new account', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
    })

    await test.step('Action: fill a Checking account with agency, number, balance and currency', async () => {
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseRadio(page, 'Checking')
      await page.getByRole('textbox', { name: 'Agency', exact: true }).fill('1234')
      await page.getByRole('textbox', { name: 'Number', exact: true }).fill('98765')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('1200.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the form closes and the row shows the type and the balance', async () => {
      const row = page.getByRole('row').filter({ hasText: name })
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
      await expect(row).toContainText('Checking')
      await expect(row).toContainText('1,200.00')
    })
  })

  test('a checking account without agency and number is refused', async ({ page }) => {
    await test.step('Action: save a Checking account with only a name and balance', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(uniqueName('QA No Agency'))
      await chooseRadio(page, 'Checking')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('10.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Enter the agency." and "Enter the account number." are shown and the form stays', async () => {
      await expect(page.getByText('Enter the agency.')).toBeVisible()
      await expect(page.getByText('Enter the account number.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    })
  })

  test('a credit card needs its limit and both cycle days', async ({ page }) => {
    await test.step('Action: save a Credit Card with only a name, type and currency', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(uniqueName('QA Card Empty'))
      await chooseRadio(page, 'Credit Card')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: limit, close date and due date are each asked for', async () => {
      await expect(page.getByText('Enter the limit.')).toBeVisible()
      await expect(page.getByText('Pick the close date.')).toBeVisible()
      await expect(page.getByText('Pick the due date.')).toBeVisible()
    })
  })

  test('a credit card whose close and due days are equal is refused', async ({ page }) => {
    await test.step('Action: pick the same day (10) for close and due', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(uniqueName('QA Card Same Day'))
      await chooseRadio(page, 'Credit Card')
      await page.getByRole('textbox', { name: 'Limit', exact: true }).fill('5000.00')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('100.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await chooseDay(page, 'Close date', 10)
      await chooseDay(page, 'Due date', 10)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "The close and due days must differ." is shown', async () => {
      await expect(page.getByText('The close and due days must differ.').first()).toBeVisible()
    })
  })

  test('a credit card can be saved without an opening balance', async ({ page }) => {
    const name = uniqueName('QA Card No Balance')

    await test.step('Action: create a Credit Card and leave the balance empty', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseRadio(page, 'Credit Card')
      await page.getByRole('textbox', { name: 'Limit', exact: true }).fill('5000.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await chooseDay(page, 'Close date', 5)
      await chooseDay(page, 'Due date', 15)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the card is saved and listed', async () => {
      await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
    })
  })

  test('a credit card is created with its limit and cycle days', async ({ page }) => {
    const name = uniqueName('QA Card')

    await test.step('Action: create a Credit Card closing on the 5th and due on the 15th', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseRadio(page, 'Credit Card')
      await page.getByRole('textbox', { name: 'Limit', exact: true }).fill('5000.00')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('100.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await chooseDay(page, 'Close date', 5)
      await chooseDay(page, 'Due date', 15)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the card is listed as a Credit Card with its close and due days', async () => {
      const row = page.getByRole('row').filter({ hasText: name })
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
      await expect(row).toContainText('Credit Card')
      await expect(row).toContainText('5')
      await expect(row).toContainText('15')
    })
  })

  test('a wallet can start with a zero balance', async ({ page }) => {
    const name = uniqueName('QA Zero Wallet')

    await test.step('Action: create a Wallet with a balance of 0.00', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseRadio(page, 'Wallet')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('0.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the wallet is saved and listed with a 0.00 balance', async () => {
      const row = page.getByRole('row').filter({ hasText: name })
      await expect(row).toContainText('0.00')
    })
  })

  test('an account is renamed from its edit form', async ({ page }) => {
    const original = uniqueName('QA Rename Me')
    const renamed = uniqueName('QA Renamed')

    await test.step('Precondition: create a Wallet to rename', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(original)
      await chooseRadio(page, 'Wallet')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('50.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('row').filter({ hasText: original })).toBeVisible()
    })

    await test.step('Action: press Edit on that row and change the name', async () => {
      await page.getByRole('row').filter({ hasText: original }).getByRole('button', { name: 'Edit' }).click()
      await expect(page.getByText('Edit account', { exact: true })).toBeVisible()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(renamed)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the list shows the new name and no row with the old one', async () => {
      await expect(page.getByRole('row').filter({ hasText: renamed })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: original })).toHaveCount(0)
    })
  })

  test('deleting an account asks for confirmation and removes it from the list', async ({ page }) => {
    const name = uniqueName('QA Delete Me')

    await test.step('Precondition: create a Savings account', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await chooseRadio(page, 'Savings')
      await page.getByRole('textbox', { name: 'Agency', exact: true }).fill('0002')
      await page.getByRole('textbox', { name: 'Number', exact: true }).fill('55555')
      await page.getByRole('textbox', { name: 'Balance', exact: true }).fill('300.00')
      await chooseOption(page, 'Currency', currencyOption('BRL'))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
    })

    await test.step('Action: open More actions on the row, choose Delete and cancel the confirmation', async () => {
      await openRowMenuItem(page, name, 'Delete')
      await expect(page.getByText('Delete account?')).toBeVisible()
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    })

    await test.step('Expect: the row is still listed after cancelling', async () => {
      await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible()
    })

    await test.step('Action: open More actions again, choose Delete and confirm', async () => {
      await openRowMenuItem(page, name, 'Delete')
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
    })

    await test.step('Expect: the account no longer appears in the list', async () => {
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0)
    })
  })
})

async function chooseDay(page: Page, combobox: string, day: number): Promise<void> {
  await chooseOption(page, combobox, String(day).padStart(2, '0'))
}

async function openRowMenuItem(page: Page, rowText: string, item: string): Promise<void> {
  await page.getByRole('row').filter({ hasText: rowText }).getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: item, exact: true }).click()
}
