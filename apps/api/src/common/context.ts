import type { Business, Session } from '@workspace/business'
import type { Env } from '../config/env.js'

export type AppEnv = {
  Bindings: Env
  Variables: {
    session: Session
    business: Business
  }
}

export type App = import('hono').Hono<AppEnv>
