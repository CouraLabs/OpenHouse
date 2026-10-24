import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from '@workspace/db'
import { AuthModule } from './auth/auth.module.js'
import { AuthGuard } from './common/session/auth.guard.js'
import { AuditModule } from './audit/audit.module.js'
import { ClockModule } from './common/clock/clock.module.js'
import { CsvModule } from './common/csv/csv.module.js'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { getPositiveInt, isProduction, validateEnv } from './config/env.js'
import { CategoriesModule } from './categories/categories.module.js'
import { LimitsModule } from './limits/limits.module.js'
import { AccountsModule } from './accounts/accounts.module.js'
import { BalancesModule } from './balances/balances.module.js'
import { GoalsModule } from './goals/goals.module.js'
import { TenantsModule } from './tenants/tenants.module.js'
import { SettingsModule } from './settings/settings.module.js'
import { PreferencesModule } from './preferences/preferences.module.js'
import { ReceiversModule } from './receivers/receivers.module.js'
import { RecurringTransactionsModule } from './recurring-transactions/recurring-transactions.module.js'
import { CreditCardStatementsModule } from './credit-card-statements/credit-card-statements.module.js'
import { DataExportsModule } from './data-exports/data-exports.module.js'
import { TenantDeletionModule } from './tenant-deletion/tenant-deletion.module.js'
import { HouseholdModule } from './household/household.module.js'
import { TransactionsModule } from './transactions/transactions.module.js'
import { StatementImportsModule } from './statement-imports/statement-imports.module.js'
import { NotificationsModule } from './notifications/notifications.module.js'
import { CalendarModule } from './calendar/calendar.module.js'
import { UpcomingModule } from './upcoming/upcoming.module.js'
import { TransactionLinkersModule } from './transaction-linkers/transaction-linkers.module.js'

/**
 * Requests one IP may send per `THROTTLE_TTL_MS` when the limits are enforced.
 * Sized for the web app: one page load fans out into several queries, and a
 * household can share an address. The credential routes set a tighter limit
 * of their own.
 */
const THROTTLE_LIMIT = 300

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
    // Powers the background crons: recurring rules, reminders, deletions.
    ScheduleModule.forRoot(),
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
    ClockModule,
    AuditModule,
    CsvModule,
    AuthModule,
    TenantsModule,
    SettingsModule,
    PreferencesModule,
    CategoriesModule,
    LimitsModule,
    BalancesModule,
    AccountsModule,
    GoalsModule,
    ReceiversModule,
    TransactionLinkersModule,
    CreditCardStatementsModule,
    HouseholdModule,
    TransactionsModule,
    StatementImportsModule,
    DataExportsModule,
    TenantDeletionModule,
    RecurringTransactionsModule,
    UpcomingModule,
    NotificationsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Applies the throttler to every route, so a new controller is covered
    // without repeating the guard.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Guards every route with the cookie session. The auth routes are marked
    // `@Public()` — a session is being created or replaced there, so a
    // request cannot be required to present one. Everything else 401s
    // without cookies.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
