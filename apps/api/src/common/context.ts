import type { Database } from '@workspace/db'
import type { Session } from './session/session.js'
import type { Config, Env } from '../config/env.js'

export type AppEnv = {
  Bindings: Env
  Variables: {
    session: Session
    db: Database
    config: Config
  }
}

export type App = import('hono').Hono<AppEnv>
