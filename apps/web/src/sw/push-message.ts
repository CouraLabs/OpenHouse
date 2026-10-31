import type {
  NotificationBody,
  PushPayload,
  ReminderDetail,
} from '@workspace/dto'

export interface PushMessage {
  title: string
  body: string
}

const FALLBACK: PushPayload = { v: 1, count: 1, url: '/upcoming' }

export function parsePushPayload(text: string | undefined): PushPayload {
  if (text === undefined || text === '') {
    return FALLBACK
  }

  try {
    const parsed = JSON.parse(text) as Partial<PushPayload>

    return {
      v: 1,
      count: typeof parsed.count === 'number' ? parsed.count : 1,
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

export function pushMessage(payload: PushPayload): PushMessage {
  const title = 'Kantim'

  if (payload.details === undefined || payload.details.length === 0) {
    return {
      title,
      body:
        payload.count === 1
          ? 'You have a reminder. Open Kantim to see it.'
          : `You have ${payload.count} reminders. Open Kantim to see them.`,
    }
  }

  return {
    title,
    body: payload.details.flatMap(describe).join('\n'),
  }
}

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
