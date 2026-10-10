import { Module } from '@nestjs/common'
import { DrizzleModule } from '@nestjs/drizzle'
import { drizzle } from 'drizzle-orm/node-postgres'
import { getPoolConfig } from './env.js'
import { relations } from './relations.js'

/**
 * Registers the PostgreSQL database for the whole application. `DrizzleModule`
 * is global, so a provider injects the database with `@InjectDrizzle()` without
 * importing this module.
 *
 * The options come from a factory, which runs once per application. Every
 * application therefore gets its own connection pool — including each one an
 * e2e test creates — and that pool is closed when the application shuts down.
 *
 * The pool itself is tuned from the environment; see `getPoolConfig`.
 */
@Module({
  imports: [
    DrizzleModule.forRootAsync({
      useFactory: () => ({
        drizzle,
        connection: getPoolConfig(),
        relations,
      }),
    }),
  ],
})
export class DatabaseModule {}
