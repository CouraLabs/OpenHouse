import type { Database } from '@workspace/db'
import type { Session } from './session/session.js'
import type { Config, Env } from '../config/env.js'

/**
 * The Hono environment of every route: the Worker's bindings and vars, and
 * the variables the middleware sets — the session the auth middleware
 * resolved, the request-scoped database handle, the parsed config.
 */
export type AppEnv = {
  Bindings: Env
  Variables: {
    session: Session
    db: Database
    config: Config
  }
}

/** A Hono sub-app or handler typed with the app's environment. */
export type App = import('hono').Hono<AppEnv>
