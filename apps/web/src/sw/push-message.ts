import type {
  NotificationBody,
  PushPayload,
  ReminderDetail,
} from '@workspace/poco'

/**
 * What a push message says. The service worker has no access to the app's
 * i18n bundle, so the copy lives here — English today, like the app's only
 * locale — and the worker stays free of the React app.
 */

/** The title and body of the system notification. */
export interface PushMessage {
  title: string
  body: string
}

/** The payload a message carries when it is empty or unreadable: still a
 * quiet nudge, never an error. */
const FALLBACK: PushPayload = { v: 1, count: 1, url: '/upcoming' }

/** Reads a push message's text into a payload, tolerating garbage. */
export function parsePushPayload(text: string | undefined): PushPayload {
  if (text === undefined || text === '') {
    return FALLBACK
  }

  try {
    const parsed = JSON.parse(text) as Partial<PushPayload>

    return {
      v: 1,
      count: typeof parsed.count === 'number' ? parsed.count : 1,
      // Only an in-app path is ever opened: a payload cannot send the
      // user to another site.
      url:
        typeof parsed.url === 'string' && parsed.url.startsWith('/')
          ? parsed.url
          : FALLBACK.url,
      ...(Array.isArray(parsed.details) ? { details: parsed.details } : {}),
    }
  } catch {
    return FALLBACK
  }
}

/**
 * The notification to show. Quiet by default: without `details` it says
 * only that reminders are waiting — no amounts, no names. A user who opted
 * in to details gets the reminders themselves.
 */
export function pushMessage(payload: PushPayload): PushMessage {
  const title = 'OpenHouse'

  if (payload.details === undefined || payload.details.length === 0) {
    return {
      title,
      body:
        payload.count === 1
          ? 'You have a reminder. Open OpenHouse to see it.'
          : `You have ${payload.count} reminders. Open OpenHouse to see them.`,
    }
  }

  return {
    title,
    body: payload.details.flatMap(describe).join('\n'),
  }
}

/** One line per reminder; a digest unfolds into its items. */
function describe(body: NotificationBody): string[] {
  return body.kind === 'digest' ? body.items.map(line) : [line(body)]
}

function line(detail: ReminderDetail): string {
  switch (detail.kind) {
    case 'bill_due':
      return `${detail.accountName} bill ${money(detail)} is due ${detail.dueDate}`
    case 'bill_overdue':
      return `${detail.accountName} bill ${money(detail)} is overdue (was due ${detail.dueDate})`
    case 'recurring_due':
      return `${detail.name} ${money(detail)} on ${detail.date}`
    case 'limit_alert':
      return `${detail.categoryName} is at ${detail.percent}% of its ${detail.limitType.toLowerCase()} limit`
    default: {
      const exhaustive: never = detail
      return String(exhaustive)
    }
  }
}

function money(detail: { amount: string; currency: string }): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: detail.currency,
  }).format(detail.amount as Intl.StringNumericLiteral)
}
