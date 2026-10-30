import { expect, test } from '../../support/test.js'

test.describe('form sheet', () => {
  test('the form opens full screen at 375px with the first field focused and Save in view', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await test.step('Action: open Accounts and choose to add one', async () => {
      await page.goto('accounts')
      await page.getByRole('button', { name: 'New account' }).click()
    })

    const dialog = page.getByRole('dialog')

    await test.step('Expect: the sheet fills the screen and the name field has focus', async () => {
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused()
      const box = await dialog.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(374)
    })

    await test.step('Expect: Save is in the viewport and at least 44px tall, Cancel sits on its left', async () => {
      const save = dialog.getByRole('button', { name: 'Save', exact: true })
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
      await expect(save).toBeInViewport()
      const saveBox = await save.boundingBox()
      const cancelBox = await cancel.boundingBox()
      expect(saveBox?.height).toBeGreaterThanOrEqual(44)
      expect(cancelBox?.x).toBeLessThan(saveBox?.x ?? 0)
    })

    await test.step('Action: cancel closes the sheet', async () => {
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(dialog).toBeHidden()
    })
  })
})
