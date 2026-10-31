import { expect, test } from '../../support/test.js'

test.describe('api errors', () => {
  test('an unknown API route answers with the app\'s own not-found message', async ({ request }) => {
    await test.step('Action: request an API route that does not exist', async () => {
      const response = await request.get('/api/no-such-route')

      await test.step('Expect: a 404 with the app\'s JSON message and no framework text', async () => {
        expect(response.status()).toBe(404)
        expect(response.headers()['content-type']).toContain('application/json')
        expect(await response.json()).toMatchObject({ message: 'Not found.', statusCode: 404 })
      })
    })
  })
})
