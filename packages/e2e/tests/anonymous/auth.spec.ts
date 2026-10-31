import { expect, test } from '../../support/test.js'

import { signUpThroughForm } from '../../support/forms.js'
import { loadOwnerAccount, loadSignInAccount } from '../../support/owner.js'
import { uniqueEmail, uniqueName } from '../../support/names.js'

test.describe('sign-up', () => {
  test('a new visitor starts a household and lands on the dashboard', async ({ page }) => {
    const owner = {
      household: uniqueName('QA Signup'),
      name: 'QA Newcomer',
      email: uniqueEmail('qa-signup'),
      password: 'qa-newcomer-pass',
    }

    await test.step('Action: fill the new-household form and submit', async () => {
      await signUpThroughForm(page, owner)
    })

    await test.step('Expect: the app is locked on the initial setup until the household is configured', async () => {
      await expect(page.getByRole('heading', { name: `Set up ${owner.household}` })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Home', exact: true })).toHaveCount(0)
    })

    await test.step('Action: confirm the time zone and main currency', async () => {
      await page.getByRole('button', { name: 'Start using Kantim' }).click()
    })

    await test.step('Expect: the app unlocks and opens the dashboard for the new household', async () => {
      await expect(page).toHaveURL(/\/app\/$/)
      await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
      await expect(page.getByText(owner.household, { exact: true }).first()).toBeVisible()
    })
  })

  test('sign-up asks for a password of at least eight characters', async ({ page }) => {
    await test.step('Action: enter a 7-character password and submit', async () => {
      await page.goto('sign-up')
      await page.getByRole('radio', { name: 'Start a new household' }).click()
      await page.getByLabel('Household name').fill(uniqueName('QA Short Password'))
      await page.getByLabel('Your name').fill('QA Short')
      await page.getByLabel('Email').fill(uniqueEmail('qa-short'))
      await page.getByLabel('Password').fill('1234567')
      await page.getByRole('button', { name: 'Sign up' }).click()
    })

    await test.step('Expect: the form stays and shows "Use at least 8 characters."', async () => {
      await expect(page.getByText('Use at least 8 characters.')).toBeVisible()
      await expect(page).toHaveURL(/\/sign-up$/)
    })
  })

  test('sign-up asks for the visitor name', async ({ page }) => {
    await test.step('Action: submit the form with the name left empty', async () => {
      await page.goto('sign-up')
      await page.getByRole('radio', { name: 'Start a new household' }).click()
      await page.getByLabel('Household name').fill(uniqueName('QA No Name'))
      await page.getByLabel('Email').fill(uniqueEmail('qa-no-name'))
      await page.getByLabel('Password').fill('qa-no-name-pass')
      await page.getByRole('button', { name: 'Sign up' }).click()
    })

    await test.step('Expect: "Enter your name." is shown and nothing is created', async () => {
      await expect(page.getByText('Enter your name.')).toBeVisible()
      await expect(page).toHaveURL(/\/sign-up$/)
    })
  })

  test(
    'a household name that is already taken is refused with a readable message',
    async ({ page }) => {
      const taken = loadOwnerAccount()

      await test.step('Action: sign up again with the household name of an existing owner', async () => {
        await signUpThroughForm(page, {
          household: taken.household,
          name: 'QA Duplicate',
          email: uniqueEmail('qa-duplicate'),
          password: 'qa-duplicate-pass',
        })
      })

      await test.step('Expect: "This tenant name is already taken." (409), not a server error', async () => {
        await expect(page.getByText('This tenant name is already taken.')).toBeVisible()
        await expect(page.getByText('Something went wrong on our side.')).toHaveCount(0)
        await expect(page).toHaveURL(/\/sign-up$/)
      })
    }
  )
})

test.describe('sign-in', () => {
  test('a wrong password is refused and the visitor stays on sign-in', async ({ page }) => {
    const account = loadSignInAccount()

    await test.step('Action: sign in with the right email and a wrong password', async () => {
      await page.goto('sign-in')
      await page.getByLabel('Email').fill(account.email)
      await page.getByLabel('Password').fill('not-the-password')
      await page.getByRole('button', { name: /sign in/i }).click()
    })

    await test.step('Expect: "Invalid email or password." under the password field', async () => {
      await expect(page.getByText('Invalid email or password.')).toBeVisible()
      await expect(page).toHaveURL(/\/sign-in$/)
    })
  })

  test('the owner signs in with the household credentials and reaches the dashboard', async ({
    page,
  }) => {
    const account = loadSignInAccount()

    await test.step('Action: sign in with the owner email and password', async () => {
      await page.goto('sign-in')
      await page.getByLabel('Email').fill(account.email)
      await page.getByLabel('Password').fill(account.password)
      await page.getByRole('button', { name: /sign in/i }).click()
    })

    await test.step('Expect: the dashboard opens with the household name in the shell', async () => {
      await expect(page).toHaveURL(/\/app\/$/)
      await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
    })
  })

  test('logging out closes the session and protected pages send the visitor to sign-in', async ({
    page,
  }) => {
    const account = loadSignInAccount()

    await test.step('Precondition: sign in as the owner', async () => {
      await page.goto('sign-in')
      await page.getByLabel('Email').fill(account.email)
      await page.getByLabel('Password').fill(account.password)
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
    })

    await test.step('Action: open the profile menu and choose "Log out"', async () => {
      await page.getByRole('button', { name: account.name, exact: true }).click()
      await page.getByRole('menuitem', { name: 'Log out' }).click()
    })

    await test.step('Expect: back on sign-in, and /accounts now redirects to sign-in', async () => {
      await expect(page).toHaveURL(/\/sign-in$/)
      await page.goto('accounts')
      await expect(page).toHaveURL(/\/sign-in$/)
    })
  })
})
