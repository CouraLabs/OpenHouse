import {
  AccountRepository,
  AuditLogRepository,
  CalendarFeedRepository,
  CategoryRepository,
  createDatabase,
  DataExportRepository,
  GoalRepository,
  HouseholdRepository,
  ImportMappingRepository,
  ImportTransactionRepository,
  InstallmentRepository,
  LimitRepository,
  NotificationLogRepository,
  NotificationPreferencesRepository,
  NotificationRepository,
  PasswordResetRepository,
  PreferencesRepository,
  PushSubscriptionRepository,
  ReceiverRepository,
  RecurringTransactionRepository,
  SettingsRepository,
  SignInAttemptRepository,
  TenantDeletionRepository,
  TenantUserRepository,
  TierRepository,
  TransactionLinkerRepository,
  UserSessionRepository,
  type Database,
} from '@workspace/db'
import { DEVELOPER_TIER, FREE_TIER, type TierLevel } from '@workspace/domain'
import type { AuthConfig } from '@workspace/dto'

import { AccountService } from './accounts/account.service.js'
import { AuditLogService } from './audit/audit-log.service.js'
import { AuthService } from './auth/auth.service.js'
import { EmailVerificationService } from './auth/email-verification.service.js'
import { PasswordChangeLimiter } from './auth/password-change-limiter.js'
import { PasswordResetService } from './auth/password-reset.service.js'
import { ResetAttemptLimiter } from './auth/reset-attempt-limiter.js'
import { SIGN_IN_ATTEMPT_RETENTION_MS } from './auth/sign-in-captcha-policy.js'
import { SignInGuard } from './auth/sign-in-guard.js'
import { TokenSessionResolver } from './auth/token-session.resolver.js'
import { TokenService, type JwtTtls } from './auth/token.service.js'
import { BalanceService } from './balances/balance.service.js'
import { checkBalancesForTenant } from './balances/balances.jobs.js'
import { CalendarService } from './calendar/calendar.service.js'
import { CategoryService } from './categories/category.service.js'
import { CreditCardStatementService } from './credit-card-statements/credit-card-statement.service.js'
import { StatementBillSource } from './credit-card-statements/statement-bill.source.js'
import { StatementCycleSyncService } from './credit-card-statements/statement-cycle-sync.service.js'
import { DataExportService } from './data-exports/data-export.service.js'
import { GoalProgressSource } from './goals/goal-progress.source.js'
import { GoalService } from './goals/goal.service.js'
import { HouseholdService } from './household/household.service.js'
import { logDatabaseSize } from './jobs/size-watch.js'
import {
  listAllTenants,
  listTenantsScheduledForDeletion,
  listTenantsWithActiveRules,
} from './jobs/tenants.js'
import { LimitUsageSource } from './limits/limit-usage.source.js'
import { LimitService } from './limits/limit.service.js'
import { NotificationService } from './notifications/notification.service.js'
import { PushService } from './notifications/push.service.js'
import { ReminderDeliveryService } from './notifications/reminder-delivery.service.js'
import {
  ReminderRunService,
  type ReminderSources,
} from './notifications/reminder-run.service.js'
import { runRemindersForTenant } from './notifications/reminders.jobs.js'
import type { Clock } from './ports/clock.js'
import type { Mailer } from './ports/mailer.js'
import type { PushTransport } from './ports/push-transport.js'
import {
  TurnstileVerifier,
  type TurnstileConfig,
  type SiteverifyFn,
} from './ports/turnstile-verifier.js'
import { PreferencesService } from './preferences/preferences.service.js'
import { TipsService } from './tips/tips.service.js'
import { ReceiverService } from './receivers/receiver.service.js'
import { RecurringRuleSource } from './recurring-transactions/recurring-rule.source.js'
import { RecurringRunService } from './recurring-transactions/recurring-run.service.js'
import { RecurringTransactionService } from './recurring-transactions/recurring-transaction.service.js'
import { runRecurringForTenant } from './recurring-transactions/recurring.jobs.js'
import { SettingsService } from './settings/settings.service.js'
import { ImportCommitService } from './statement-imports/import-commit.service.js'
import { ImportPreviewService } from './statement-imports/import-preview.service.js'
import { deleteTenantNow } from './tenant-deletion/tenant-deletion.jobs.js'
import { TenantDeletionService } from './tenant-deletion/tenant-deletion.service.js'
import { InviteCodeService } from './tenants/invite-code.service.js'
import { TenantUserService } from './tenants/tenant-user.service.js'
import { TierGateService } from './tiers/tier-gate.service.js'
import { TransactionLinkerService } from './transaction-linkers/transaction-linker.service.js'
import { InstallmentService } from './transactions/installment.service.js'
import { ReconciliationService } from './transactions/reconciliation.service.js'
import { TransactionService } from './transactions/transaction.service.js'
import { UpcomingService } from './upcoming/upcoming.service.js'
import { InstallmentGroups } from './transactions/installment-groups.js'
import { ledgerFor } from './transactions/ledger-wiring.js'

export interface CreateBusinessOptions {
  d1?: unknown
  db?: Database
  clock: Clock
  mailer: Mailer
  pushTransport: PushTransport
  siteverify: SiteverifyFn
  config: {
    environment: 'development' | 'production'
    jwtSecret: string
    ttls: JwtTtls
    appUrl: string
    emailVerification: boolean
    turnstile?: TurnstileConfig
  }
}

export interface Business {
  db: Database
  clock: Clock
  audit: AuditLogService
  tokens: TokenService
  sessions: TokenSessionResolver
  auth: AuthService
  emailVerification: EmailVerificationService
  passwordChanges: PasswordChangeLimiter
  passwordResets: PasswordResetService
  turnstile: TurnstileVerifier
  signInGuard: SignInGuard
  authConfig: AuthConfig
  tiers: TierGateService
  inviteCodes: InviteCodeService
  tenantUsers: TenantUserService
  tenantDeletion: TenantDeletionService
  settings: SettingsService
  preferences: PreferencesService
  categories: CategoryService
  receivers: ReceiverService
  transactionLinkers: TransactionLinkerService
  accounts: AccountService
  limits: LimitService
  goals: GoalService
  tips: TipsService
  balances: BalanceService
  statements: CreditCardStatementService
  transactions: TransactionService
  installments: InstallmentService
  reconciliation: ReconciliationService
  recurring: RecurringTransactionService
  recurringRuns: RecurringRunService
  upcoming: UpcomingService
  household: HouseholdService
  notifications: NotificationService
  push: PushService
  reminderRuns: ReminderRunService
  calendar: CalendarService
  importPreview: ImportPreviewService
  importCommits: ImportCommitService
  dataExports: DataExportService
  jobs: {
    listAllTenants(): Promise<number[]>
    listTenantsWithActiveRules(): Promise<number[]>
    listTenantsScheduledForDeletion(): Promise<
      Array<{ tenantId: number; deletionDate: string }>
    >
    logDatabaseSize(tenantId?: number): Promise<Record<string, number>>
    pruneSignInAttempts(): Promise<void>
    runRecurringForTenant(tenantId: number): Promise<number>
    runRemindersForTenant(tenantId: number): Promise<number>
    deleteTenantNow(tenantId: number): Promise<void>
    checkBalancesForTenant(tenantId: number): Promise<number>
  }
}

export function createBusiness(options: CreateBusinessOptions): Business {
  const db =
    options.db ??
    createDatabase(options.d1 as Parameters<typeof createDatabase>[0])
  const { clock, mailer, pushTransport, siteverify, config } = options

  const auditRepo = new AuditLogRepository(db)
  const audit = new AuditLogService(auditRepo)

  const settingsRepo = new SettingsRepository(db)
  const settings = new SettingsService(settingsRepo, clock)

  const preferences = new PreferencesService(new PreferencesRepository(db))

  const tiers = new TierGateService(new TierRepository(db), clock)

  const tokens = new TokenService(config.jwtSecret, config.ttls)
  const sessions = new TokenSessionResolver(tokens, db)
  const defaultTier: TierLevel =
    config.environment === 'development' ? DEVELOPER_TIER : FREE_TIER
  const auth = new AuthService(
    db,
    tokens,
    settingsRepo,
    config.ttls,
    config.emailVerification,
    defaultTier,
    tiers,
    new UserSessionRepository(db),
    clock
  )
  const emailVerification = new EmailVerificationService(
    db,
    mailer,
    clock,
    config.appUrl
  )
  const passwordChanges = new PasswordChangeLimiter(clock)
  const passwordResets = new PasswordResetService(
    new PasswordResetRepository(db),
    new ResetAttemptLimiter(clock),
    clock
  )
  const turnstile = new TurnstileVerifier(config.turnstile, siteverify)
  const signInAttemptRepo = new SignInAttemptRepository(db)
  const signInGuard = new SignInGuard(signInAttemptRepo, turnstile, clock)
  const authConfig: AuthConfig = {
    captcha:
      config.turnstile === undefined
        ? null
        : { siteKey: config.turnstile.siteKey },
    emailVerification: config.emailVerification,
  }

  const inviteCodes = new InviteCodeService(db, clock)
  const tenantUsers = new TenantUserService(
    new TenantUserRepository(db),
    audit,
    clock
  )
  const tenantDeletion = new TenantDeletionService(
    db,
    new TenantDeletionRepository(db),
    settingsRepo,
    audit,
    clock
  )

  const householdRepo = new HouseholdRepository(db)
  const household = new HouseholdService(householdRepo, settingsRepo)

  const categoryRepo = new CategoryRepository(db)
  const categories = new CategoryService(categoryRepo, householdRepo)

  const receiverRepo = new ReceiverRepository(db)
  const receivers = new ReceiverService(receiverRepo)

  const linkerRepo = new TransactionLinkerRepository(db)
  const transactionLinkers = new TransactionLinkerService(
    linkerRepo,
    categoryRepo,
    receiverRepo
  )

  const ledger = ledgerFor(db, clock)
  const statementRepo = ledger.statements
  const statements = new CreditCardStatementService(
    statementRepo,
    ledger.bills,
    ledger.today
  )
  const statementCycleSync = new StatementCycleSyncService(
    statementRepo,
    ledger.today
  )
  const billSource = new StatementBillSource(ledger.bills)

  const accountRepo = new AccountRepository(db)
  const accounts = new AccountService(
    accountRepo,
    statementCycleSync,
    ledger.bills
  )

  const balanceRepo = ledger.balances
  const balances = new BalanceService(balanceRepo)

  const transactionRepo = ledger.transactions

  const installments = new InstallmentService(
    new InstallmentGroups(
      new InstallmentRepository(db),
      transactionRepo,
      ledger.planner
    ),
    transactionRepo,
    accountRepo,
    categoryRepo,
    receiverRepo,
    ledger.today,
    householdRepo
  )

  const transactions = new TransactionService(
    transactionRepo,
    accountRepo,
    categoryRepo,
    receiverRepo,
    statementRepo,
    installments,
    householdRepo,
    tiers,
    ledger.writes,
    ledger.bills,
    ledger.today
  )

  const reconciliation = new ReconciliationService(
    transactionRepo,
    accountRepo,
    categoryRepo,
    balanceRepo,
    ledger.writes
  )

  const limitRepo = new LimitRepository(db)
  const limits = new LimitService(
    limitRepo,
    categoryRepo,
    transactionRepo,
    settingsRepo,
    clock
  )
  const limitSource = new LimitUsageSource(limits)

  const goalRepo = new GoalRepository(db)
  const goals = new GoalService(goalRepo, accountRepo, settingsRepo)
  const goalSource = new GoalProgressSource(goalRepo, settingsRepo)

  const recurringRepo = new RecurringTransactionRepository(db)
  const recurring = new RecurringTransactionService(
    recurringRepo,
    receiverRepo,
    categoryRepo,
    accountRepo,
    householdRepo,
    settingsRepo,
    clock
  )
  const recurringSource = new RecurringRuleSource(
    recurringRepo,
    transactionRepo
  )
  const recurringRuns = new RecurringRunService(
    recurringRepo,
    transactionRepo,
    accountRepo,
    categoryRepo,
    receiverRepo,
    settingsRepo,
    clock,
    householdRepo,
    ledger.writes
  )

  const upcoming = new UpcomingService(
    billSource,
    recurringSource,
    limitSource,
    goalSource,
    accountRepo,
    settingsRepo,
    clock
  )

  const notificationRepo = new NotificationRepository(db)
  const notificationPreferencesRepo = new NotificationPreferencesRepository(db)
  const notifications = new NotificationService(
    notificationRepo,
    notificationPreferencesRepo,
    clock
  )
  const push = new PushService(
    new PushSubscriptionRepository(db),
    pushTransport
  )
  const reminderDelivery = new ReminderDeliveryService(
    new NotificationLogRepository(db),
    notificationRepo,
    push
  )
  const reminderSources: ReminderSources = {
    bills: billSource,
    recurring: recurringSource,
    limits: limitSource,
    delivery: reminderDelivery,
  }
  const reminderRuns = new ReminderRunService(
    notificationPreferencesRepo,
    settingsRepo,
    reminderSources,
    clock
  )

  const calendar = new CalendarService(
    new CalendarFeedRepository(db),
    billSource,
    recurringSource,
    settingsRepo,
    clock
  )

  const importTxRepo = new ImportTransactionRepository(db)
  const importMappingRepo = new ImportMappingRepository(db)
  const importPreview = new ImportPreviewService(
    accountRepo,
    categoryRepo,
    receiverRepo,
    linkerRepo,
    importTxRepo,
    importMappingRepo
  )
  const importCommits = new ImportCommitService(
    ledger.planner,
    transactionRepo,
    importTxRepo,
    importMappingRepo,
    accountRepo,
    categoryRepo,
    receiverRepo,
    clock
  )

  const dataExports = new DataExportService(
    new DataExportRepository(db),
    audit,
    clock
  )

  return {
    db,
    clock,
    audit,
    tokens,
    sessions,
    auth,
    emailVerification,
    passwordChanges,
    passwordResets,
    turnstile,
    signInGuard,
    authConfig,
    tiers,
    inviteCodes,
    tenantUsers,
    tenantDeletion,
    settings,
    preferences,
    categories,
    receivers,
    transactionLinkers,
    accounts,
    limits,
    goals,
    balances,
    tips: new TipsService(),
    statements,
    transactions,
    installments,
    reconciliation,
    recurring,
    recurringRuns,
    upcoming,
    household,
    notifications,
    push,
    reminderRuns,
    calendar,
    importPreview,
    importCommits,
    dataExports,
    jobs: {
      listAllTenants: () => listAllTenants(db),
      listTenantsWithActiveRules: () => listTenantsWithActiveRules(db),
      listTenantsScheduledForDeletion: () =>
        listTenantsScheduledForDeletion(db),
      logDatabaseSize: (tenantId?: number) => logDatabaseSize(db, tenantId),
      pruneSignInAttempts: () =>
        signInAttemptRepo.deleteOlderThan(
          new Date(clock.now().getTime() - SIGN_IN_ATTEMPT_RETENTION_MS)
        ),
      runRecurringForTenant: (tenantId: number) =>
        runRecurringForTenant(db, clock, tenantId),
      runRemindersForTenant: (tenantId: number) =>
        runRemindersForTenant(db, clock, tenantId, pushTransport),
      deleteTenantNow: (tenantId: number) =>
        deleteTenantNow(db, clock, tenantId, audit),
      checkBalancesForTenant: (tenantId: number) =>
        checkBalancesForTenant(db, tenantId),
    },
  }
}
