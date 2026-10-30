import { expect, test } from '../../support/test.js'

test.describe('settings', () => {
  test('the general settings show the time zone and the BRL main currency', async ({ page }) => {
    await test.step('Action: open Settings and the General section', async () => {
      await page.goto('settings/general')
    })

    await test.step('Expect: the time zone and the main currency are shown', async () => {
      await expect(page.getByRole('combobox', { name: 'Main currency', exact: true })).toContainText('BRL')
      await expect(page.getByRole('combobox', { name: 'Time zone', exact: true })).toBeVisible()
    })
  })

  test('a wrong current password is refused when changing the password', async ({ page }) => {
    await test.step('Action: open Security and submit a change with a wrong current password', async () => {
      await page.goto('settings/security')
      await page.getByRole('textbox', { name: 'Current password', exact: true }).fill('not-the-password')
      await page.getByRole('textbox', { name: 'New password', exact: true }).fill('new-owner-pass')
      await page.getByRole('textbox', { name: 'Confirm new password', exact: true }).fill('new-owner-pass')
      await page.getByRole('button', { name: 'Change password' }).click()
    })

    await test.step('Expect: the form reports the wrong password and the owner stays signed in', async () => {
      await expect(page.getByText(/current password|invalid|incorrect/i).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    })
  })

  test('generating recovery codes shows a list of codes', async ({ page }) => {
    await test.step('Action: open Security and generate recovery codes', async () => {
      await page.goto('settings/security')
      await page.getByRole('button', { name: 'Generate recovery codes', exact: true }).click()
    })

    await test.step('Expect: the codes are listed in place of the empty state, with a save-once warning', async () => {
      await expect(page.getByText('You have no recovery codes yet.')).toHaveCount(0)
      await expect(page.getByText('Save these now — they are shown only once.')).toBeVisible()
      await expect(page.locator('ol li').first()).toBeVisible()
    })
  })

  test('the Users section opens the add-user dialog', async ({ page }) => {
    await test.step('Action: open Users and press Add user', async () => {
      await page.goto('settings/users')
      await page.getByRole('button', { name: 'Add user' }).click()
    })

    await test.step('Expect: the dialog opens', async () => {
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  test('an unknown settings section sends the visitor back to Settings', async ({ page }) => {
    await test.step('Action: open /settings/no-such-section', async () => {
      await page.goto('settings/no-such-section')
    })

    await test.step('Expect: the app redirects to /settings', async () => {
      await expect(page).toHaveURL(/\/app\/settings$/)
    })
  })
})
