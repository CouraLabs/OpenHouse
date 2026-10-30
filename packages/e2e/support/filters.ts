import type { Page } from '@playwright/test'

export async function filterByName(page: Page, text: string): Promise<void> {
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Name' }).fill(text)
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
}
