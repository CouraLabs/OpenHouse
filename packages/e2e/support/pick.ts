import type { Locator, Page } from '@playwright/test'

export async function chooseOption(
  page: Page,
  combobox: string,
  option: string | RegExp,
  scope: Locator = page.locator('body')
): Promise<void> {
  await scope.getByRole('combobox', { name: combobox, exact: true }).click()
  await page.getByRole('option', { name: option }).click()
}

export function currencyOption(code: string): RegExp {
  return new RegExp(`(^|\\s)${code}(\\s|$)`)
}

export async function openRowMenuItem(
  page: Page,
  rowText: string,
  item: string
): Promise<void> {
  await transactionRowMenu(page, rowText).click()
  await page.getByRole('menuitem', { name: item, exact: true }).click()
}

function transactionRowMenu(page: Page, rowText: string): Locator {
  return page
    .locator('div.grid.items-center')
    .filter({ hasText: rowText })
    .getByRole('button', { name: 'More actions' })
}
