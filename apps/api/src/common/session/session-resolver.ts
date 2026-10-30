import type { Session } from './session.js'

export abstract class SessionResolver {
  abstract resolve(accessToken: string): Promise<Session | null>
}
