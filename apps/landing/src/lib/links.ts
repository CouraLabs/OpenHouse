/** Where the source lives — the self-hosted plan points here. */
export const GITHUB_URL = 'https://github.com/CouraLabs/OpenHouse'

/**
 * The web app's origin, from `VITE_APP_URL` (`.env`). Read once here so no
 * component reaches for `import.meta.env` itself; `vite.config.ts` refuses
 * to start without it.
 */
export const APP_URL: string = import.meta.env.VITE_APP_URL.replace(/\/$/, '')

/** The web app's sign-up page. */
export const SIGN_UP_URL = `${APP_URL}/sign-up`

/** The web app's sign-in page. */
export const SIGN_IN_URL = `${APP_URL}/sign-in`
