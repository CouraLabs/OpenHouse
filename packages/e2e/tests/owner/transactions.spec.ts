import { expect, test } from '../../support/test.js'
import type { Locator, Page } from '../../support/test.js'

import { chooseOption, openRowMenuItem } from '../../support/pick.js'
import { uniqueName } from '../../support/names.js'
import { seedAccount, seedCategory, seedCreditCard, seedExpense } from '../../support/seed.js'

test.describe('transactions', () => {
  test('an expense is recorded against an account and a category', async ({ page, request }) => {
    const account = await seedAccount(request)
    const category = await seedCategory(request)
    const name = uniqueName('QA Lunch')

    await test.step('Action: open Transactions and choose New transaction', async () => {
      await page.goto('transactions')
      await page.locator('#main-content').getByRole('button', { name: 'New transaction' }).click()
      await expect(page.getByRole('dialog').getByText('New transaction')).toBeVisible()
    })

    await test.step('Action: fill an expense of 25.00 on the account and category', async () => {
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await dialog.getByRole('radiogroup').getByRole('radio').nth(1).check()
      await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('25.00')
      await chooseOption(page, 'Account', account.name, dialog)
      await chooseOption(page, 'Category', category.name, dialog)
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the dialog closes and the row shows the expense', async () => {
      await expect(page.getByRole('heading', { name: 'New transaction', exact: true })).toHaveCount(0)
      const row = transactionRow(page, name)
      await expect(row).toBeVisible()
      await expect(row).toContainText(account.name)
      await expect(row).toContainText(category.name)
      await expect(row).toContainText('25.00')
    })
  })

  test('an income is recorded with a positive amount', async ({ page, request }) => {
    const account = await seedAccount(request)
    const category = await seedCategory(request)
    const name = uniqueName('QA Salary')

    await test.step('Action: add an Income of 4,500.00 to the account', async () => {
      await page.goto('transactions')
      await page.locator('#main-content').getByRole('button', { name: 'New transaction' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
      await dialog.getByRole('radiogroup').getByRole('radio').nth(0).check()
      await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('4500.00')
      await chooseOption(page, 'Account', account.name, dialog)
      await chooseOption(page, 'Category', category.name, dialog)
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the row shows 4,500.00 without a minus sign', async () => {
      const row = transactionRow(page, name)
      await expect(row).toBeVisible()
      await expect(row).toContainText('4,500.00')
      await expect(row).not.toContainText('−R$4,500.00')
    })
  })

  test('a transaction without account and category is refused', async ({ page }) => {
    await test.step('Action: save a new transaction with only a name and amount', async () => {
      await page.goto('transactions')
      await page.locator('#main-content').getByRole('button', { name: 'New transaction' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(uniqueName('Unsorted entry'))
      await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('10.00')
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: "Pick an account." and "Pick a category." are shown and the dialog stays', async () => {
      await expect(page.getByText('Pick an account.')).toBeVisible()
      await expect(page.getByText('Pick a category.')).toBeVisible()
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  test('an expense is edited and the new amount is shown', async ({ page, request }) => {
    const account = await seedAccount(request)
    const category = await seedCategory(request)
    const name = uniqueName('QA Edit Expense')

    await test.step('Precondition: seed an expense of 10.00', async () => {
      await seedExpense(request, { name, amount: '10.00', accountId: account.id, categoryId: category.id })
      await page.goto('transactions')
      await expect(transactionRow(page, name)).toBeVisible()
    })

    await test.step('Action: press Edit on the row, change the amount to 12.00 and save', async () => {
      await transactionRow(page, name).getByRole('button', { name: 'Edit' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Edit transaction')).toBeVisible()
      await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('12.00')
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the row now shows 12.00 and not 10.00', async () => {
      const row = transactionRow(page, name)
      await expect(row).toContainText('12.00')
      await expect(row).not.toContainText('10.00')
    })
  })

  test('deleting a transaction asks for confirmation and removes it', async ({ page, request }) => {
    const account = await seedAccount(request)
    const category = await seedCategory(request)
    const name = uniqueName('QA Delete Expense')

    await test.step('Precondition: seed an expense', async () => {
      await seedExpense(request, { name, amount: '7.00', accountId: account.id, categoryId: category.id })
      await page.goto('transactions')
      await expect(transactionRow(page, name)).toBeVisible()
    })

    await test.step('Action: open More actions, choose Delete and confirm', async () => {
      await openRowMenuItem(page, name, 'Delete')
      await expect(page.getByText('Delete transaction?')).toBeVisible()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
    })

    await test.step('Expect: the transaction is no longer listed', async () => {
      await expect(transactionRow(page, name)).toHaveCount(0)
    })
  })

  test('closing a filled form asks before discarding it', async ({ page }) => {
    await test.step('Action: type an amount and press Escape', async () => {
      await page.goto('transactions')
      await page.locator('#main-content').getByRole('button', { name: 'New transaction' }).click()
      const dialog = page.getByRole('dialog')
      await dialog
        .getByRole('textbox', { name: 'Amount', exact: true })
        .fill('45')
      await page.keyboard.press('Escape')
    })

    await test.step('Expect: a discard prompt appears and Keep editing returns to the form', async () => {
      await expect(page.getByText('Discard your changes?')).toBeVisible()
      await page.getByRole('button', { name: 'Keep editing' }).click()
      await expect(
        page.getByRole('textbox', { name: 'Amount', exact: true })
      ).toHaveValue('45.00')
    })

    await test.step('Expect: Discard closes the form', async () => {
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Discard', exact: true }).click()
      await expect(
        page.getByRole('textbox', { name: 'Amount', exact: true })
      ).toHaveCount(0)
    })
  })

  test('a transfer moves money between two accounts with the same currency', async ({ page, request }) => {
    const from = await seedAccount(request, { name: uniqueName('QA Transfer From') })
    const to = await seedAccount(request, { name: uniqueName('QA Transfer To') })
    const category = await seedCategory(request)

    await test.step('Action: open Transfer and move 100.00 from one account to the other', async () => {
      await page.goto('transactions')
      await page.getByRole('button', { name: 'Transfer' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Transfer between accounts')).toBeVisible()
      await chooseOption(page, 'From account', from.name, dialog)
      await chooseOption(page, 'To account', to.name, dialog)
      await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('100.00')
      await chooseOption(page, 'Category', category.name, dialog)
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    })

    await test.step('Expect: the dialog closes and both legs appear in the list', async () => {
      await expect(page.getByRole('heading', { name: 'Transfer between accounts', exact: true })).toHaveCount(0)
      await expect(transactionRow(page, from.name).first()).toBeVisible()
      await expect(transactionRow(page, to.name).first()).toBeVisible()
    })
  })

  test('a transfer offers only destination accounts in the source currency', async ({ page, request }) => {
    const from = await seedAccount(request, { name: uniqueName('QA BRL From') })
    const brl = await seedAccount(request, { name: uniqueName('QA BRL To') })
    const usd = await seedAccount(request, { name: uniqueName('QA USD To'), currency: 'USD' })

    await test.step('Action: open Transfer and pick the first BRL account as the source', async () => {
      await page.goto('transactions')
      await page.getByRole('button', { name: 'Transfer' }).click()
      const dialog = page.getByRole('dialog')
      await chooseOption(page, 'From account', from.name, dialog)
      await dialog.getByRole('combobox', { name: 'To account', exact: true }).click()
    })

    await test.step('Expect: the other BRL account is offered as the destination and the USD account is not', async () => {
      await expect(page.getByRole('option', { name: brl.name })).toBeVisible()
      await expect(page.getByRole('option', { name: usd.name })).toHaveCount(0)
    })
  })

  test('a credit card purchase can be split into 3 installments', async ({ page, request }) => {
    const card = await seedCreditCard(request)
    const category = await seedCategory(request)
    const name = uniqueName('QA Installment Purchase')

    await test.step('Precondition: seed a 300.00 purchase on the card', async () => {
      await seedExpense(request, { name, amount: '300.00', accountId: card.id, categoryId: category.id })
      await page.goto('transactions')
      await expect(transactionRow(page, name)).toBeVisible()
    })

    await test.step('Action: open More actions, choose Split into installments and set 3', async () => {
      await openRowMenuItem(page, name, 'Split into installments')
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText('Split into installments', { exact: true })).toBeVisible()
      await dialog.getByRole('textbox', { name: 'Installments', exact: true }).fill('3')
      await expect(dialog.getByText('3× of R$100.00 — R$300.00 in total')).toBeVisible()
      await dialog.getByRole('button', { name: 'Split', exact: true }).click()
    })

    await test.step('Expect: the split dialog closes, confirms the update, and the list shows three rows of R$100.00 each', async () => {
      await expect(page.getByRole('heading', { name: 'Split into installments', exact: true })).toHaveCount(0)
      await expect(page.getByText('Installment plan updated.')).toBeVisible()
      await expect(transactionRow(page, name)).toHaveCount(3)
      await expect(transactionRow(page, name).first()).toContainText('100.00')
    })
  })
})

function transactionRow(page: Page, name: string): Locator {
  return page.locator('div.grid.items-center').filter({ hasText: name })
}
