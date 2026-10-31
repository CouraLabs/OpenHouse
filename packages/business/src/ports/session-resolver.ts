import type { Session } from '@workspace/domain'

export abstract class SessionResolver {
  abstract resolve(accessToken: string): Promise<Session | null>
}
