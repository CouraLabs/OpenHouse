import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Module } from '@nestjs/common'
import { DrizzleModule } from '@nestjs/drizzle'
import { createDatabase, type DatabaseClient } from '@workspace/db'
import { createLocalD1 } from './dev-d1.js'

/**
 * Transitional: registers the local D1 stand-in (a SQLite file under
 * `.local/`) as the application database while the NestJS application still
 * boots. The real deployment binds `createDatabase(c.env.DB)` directly and
 * this module is deleted with the Nest app.
 *
 * The factory runs once per application (including every e2e application),
 * applies the pending migrations idempotently, and hands the same
 * `createDatabase` the Worker will call.
 */

/** The SQLite file the local D1 stands in for, relative to this file. */
const LOCAL_D1_PATH = join(import.meta.dirname, '../../../.local/dev.sqlite')

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      useFactory: () => {
        mkdirSync(join(LOCAL_D1_PATH, '..'), { recursive: true })
        const localD1 = createLocalD1(LOCAL_D1_PATH)
        localD1.migrate()

        return {
          drizzle: (options: { connection: DatabaseClient }) =>
            createDatabase(options.connection),
          connection: localD1 as unknown as DatabaseClient,
        }
      },
    }),
  ],
})
export class DatabaseModule {}
