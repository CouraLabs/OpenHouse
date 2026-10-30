import { isAppPath, serveApp } from './app-assets.js'

function assetsAnswering(response: Response): {
  assets: Fetcher
  requested: string[]
} {
  const requested: string[] = []
  const assets = {
    fetch: async (input: Request) => {
      requested.push(input.url)

      return response
    },
  } as unknown as Fetcher

  return { assets, requested }
}

describe('isAppPath', () => {
  it('matches the prefix and everything under it, nothing else', () => {
    expect(isAppPath('/app')).toBe(true)
    expect(isAppPath('/app/sign-in')).toBe(true)
    expect(isAppPath('/apple')).toBe(false)
    expect(isAppPath('/')).toBe(false)
  })
})

describe('serveApp', () => {
  it('strips the prefix before asking the assets binding', async () => {
    const { assets, requested } = assetsAnswering(new Response('ok'))

    await serveApp(assets, new Request('https://h.test/app/sign-up?code=x'))
    await serveApp(assets, new Request('https://h.test/app'))

    expect(requested).toEqual([
      'https://h.test/sign-up?code=x',
      'https://h.test/',
    ])
  })

  it('keeps a same-origin redirect under the prefix', async () => {
    const { assets } = assetsAnswering(
      new Response(null, { status: 307, headers: { location: '/' } })
    )

    const response = await serveApp(
      assets,
      new Request('https://h.test/app/index.html')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('/app/')
  })

  it('leaves a cross-origin redirect alone', async () => {
    const { assets } = assetsAnswering(
      new Response(null, {
        status: 302,
        headers: { location: 'https://elsewhere.test/x' },
      })
    )

    const response = await serveApp(assets, new Request('https://h.test/app/x'))

    expect(response.headers.get('location')).toBe('https://elsewhere.test/x')
  })
})
