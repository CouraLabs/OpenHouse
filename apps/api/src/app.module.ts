import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from '@workspace/db'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { getPositiveInt, isProduction, validateEnv } from './env.js'

/** Requests one IP may send per `THROTTLE_TTL_MS` when the limits are enforced. */
const THROTTLE_LIMIT = 20

/** The window the limit is counted over, in milliseconds. */
const THROTTLE_TTL_MS = 60_000

@Module({
  imports: [
    // First, so every module below is created with a validated environment.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // The in-memory store is enough while the API is a single process. A
    // shared store (Redis) is what a second replica would need.
    CacheModule.register({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      // A factory rather than `forRoot`, so the limits are read after
      // `ConfigModule` has validated and parsed the environment.
      useFactory: () => ({
        throttlers: [
          {
            ttl: getPositiveInt('THROTTLE_TTL_MS', THROTTLE_TTL_MS),
            limit: getPositiveInt('THROTTLE_LIMIT', THROTTLE_LIMIT),
            setHeaders: true,
          },
        ],
        // A deployed application enforces the limit; development and test
        // traffic is not throttled.
        skipIf: () => !isProduction(),
      }),
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Applies the throttler to every route, so a new controller is covered
    // without repeating the guard.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
