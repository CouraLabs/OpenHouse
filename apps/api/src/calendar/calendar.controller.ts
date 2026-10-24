import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import type { CalendarFeed } from '@workspace/poco'

import {
  CurrentSession,
  Public,
  type Session,
} from '../common/session/session.js'
import { CalendarService } from './calendar.service.js'

/**
 * The calendar feed. Managing it (`feed`) needs a session and acts on the
 * session's user; fetching the `.ics` is public — a calendar app has no
 * cookies — and authorized by the secret token in its path alone.
 */
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  /** The user's feed path, or null while none exists. */
  @Get('feed')
  find(@CurrentSession() session: Session): Promise<CalendarFeed> {
    return this.calendar.find(session.user.id)
  }

  /** Creates the feed or rotates its token. */
  @Post('feed')
  rotate(@CurrentSession() session: Session): Promise<CalendarFeed> {
    return this.calendar.rotate(session.tenant.id, session.user.id)
  }

  /** Deletes the feed; its URL stops working. */
  @Delete('feed')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentSession() session: Session): Promise<void> {
    return this.calendar.remove(session.user.id)
  }

  /** The `.ics` itself, fetched by a calendar app. */
  @Public()
  @Get(':file')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'private, max-age=300')
  @Header('X-Robots-Tag', 'noindex')
  async ics(@Param('file') file: string): Promise<string> {
    if (!file.endsWith('.ics')) {
      throw new NotFoundException('No such calendar.')
    }

    return this.calendar.render(file.slice(0, -'.ics'.length))
  }
}
