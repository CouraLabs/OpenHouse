import { Module } from '@nestjs/common'

import { CreditCardStatementsModule } from '../credit-card-statements/credit-card-statements.module.js'
import { LimitsModule } from '../limits/limits.module.js'
import { RecurringTransactionsModule } from '../recurring-transactions/recurring-transactions.module.js'
import { getPushConfig } from '../config/env.js'
import { SettingsModule } from '../settings/settings.module.js'
import { NotificationLogRepository } from './notification-log.repository.js'
import { NotificationPreferencesRepository } from './notification-preferences.repository.js'
import { NotificationRepository } from './notification.repository.js'
import { NotificationService } from './notification.service.js'
import { NotificationsController } from './notifications.controller.js'
import { PushSubscriptionRepository } from './push-subscription.repository.js'
import {
  PUSH_CONFIG,
  PushTransport,
  WebPushTransport,
} from './push-transport.js'
import { PushService } from './push.service.js'
import { ReminderDeliveryService } from './reminder-delivery.service.js'
import { ReminderRunService } from './reminder-run.service.js'

/**
 * Reminders: the notification centre, per-user preferences, web push, and
 * the hourly job that sends due-date reminders. The bills, rules and limits
 * come through the ports their modules export; the VAPID configuration is
 * read in `config/` and injected, so push is simply off without keys.
 */
@Module({
  imports: [
    CreditCardStatementsModule,
    LimitsModule,
    RecurringTransactionsModule,
    SettingsModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationLogRepository,
    NotificationPreferencesRepository,
    NotificationRepository,
    PushSubscriptionRepository,
    NotificationService,
    PushService,
    ReminderDeliveryService,
    ReminderRunService,
    { provide: PUSH_CONFIG, useFactory: getPushConfig },
    { provide: PushTransport, useClass: WebPushTransport },
  ],
})
export class NotificationsModule {}
