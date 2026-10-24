import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common'
import {
  notificationPreferencesSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
  type NotificationList,
  type NotificationPreferences,
  type PushConfig,
  type PushSubscriptionBody,
  type PushUnsubscribeBody,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import { CurrentSession, type Session } from '../common/session/session.js'
import { NotificationService } from './notification.service.js'
import { PushService } from './push.service.js'

/**
 * The signed-in user's own notification routes: the centre behind the bell,
 * the reminder preferences, and the browser's push subscription. Everything
 * is scoped to the session's user; no body or query names one.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly push: PushService
  ) {}

  /** The latest entries and the unread count. */
  @Get()
  list(@CurrentSession() session: Session): Promise<NotificationList> {
    return this.notifications.list(session.user.id)
  }

  /** Marks every entry read. */
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  readAll(@CurrentSession() session: Session): Promise<void> {
    return this.notifications.markAllRead(session.user.id)
  }

  /** The user's reminder preferences. */
  @Get('preferences')
  preferences(
    @CurrentSession() session: Session
  ): Promise<NotificationPreferences> {
    return this.notifications.getPreferences(session.tenant.id, session.user.id)
  }

  /** Saves the user's reminder preferences. */
  @Put('preferences')
  savePreferences(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(notificationPreferencesSchema))
    body: NotificationPreferences
  ): Promise<NotificationPreferences> {
    return this.notifications.savePreferences(
      session.tenant.id,
      session.user.id,
      body
    )
  }

  /** Whether push is available, and the public key to subscribe against. */
  @Get('push-config')
  pushConfig(): PushConfig {
    return this.push.config()
  }

  /** Stores the browser's push subscription. */
  @Post('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(pushSubscriptionSchema))
    body: PushSubscriptionBody,
    @Headers('user-agent') userAgent: string | undefined
  ): Promise<void> {
    return this.push.subscribe(
      session.tenant.id,
      session.user.id,
      body,
      userAgent?.slice(0, 255) ?? null
    )
  }

  /** Removes the browser's push subscription. */
  @Delete('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(pushUnsubscribeSchema))
    body: PushUnsubscribeBody
  ): Promise<void> {
    return this.push.unsubscribe(session.user.id, body.endpoint)
  }

  /** Marks one entry read. */
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    return this.notifications.markRead(session.user.id, id)
  }
}
