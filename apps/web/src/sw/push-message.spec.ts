import { describe, expect, it } from 'vitest'
import type { ReminderDetail } from '@workspace/poco'

import { parsePushPayload, pushMessage } from './push-message.js'

const overdue: ReminderDetail = {
  kind: 'bill_overdue',
  accountName: 'Nubank',
  statementId: 7,
  amount: '300.00',
  currency: 'BRL',
  dueDate: '2026-10-30',
}

describe('pushMessage', () => {
  it('is quiet without details: no amount, name, or kind', () => {
    const message = pushMessage({ v: 1, count: 1, url: '/upcoming' })

    expect(message.body).toBe('You have a reminder. Open OpenHouse to see it.')
    expect(`${message.title} ${message.body}`).not.toMatch(
      /Nubank|300|overdue|bill/
    )
  })

  it('counts several reminders', () => {
    expect(pushMessage({ v: 1, count: 3, url: '/upcoming' }).body).toContain(
      '3 reminders'
    )
  })

  it('spells the reminders out on opt-in', () => {
    const message = pushMessage({
      v: 1,
      count: 1,
      url: '/upcoming',
      details: [overdue],
    })

    expect(message.body).toContain('Nubank bill')
    expect(message.body).toContain('overdue')
    expect(message.body).toContain('300')
  })
})

describe('parsePushPayload', () => {
  it('falls back to a quiet nudge on empty or broken data', () => {
    for (const text of [undefined, '', 'not json', '{"count":"x"']) {
      expect(parsePushPayload(text)).toEqual({
        v: 1,
        count: 1,
        url: '/upcoming',
      })
    }
  })

  it('never opens a url outside the app', () => {
    expect(
      parsePushPayload('{"v":1,"count":2,"url":"https://evil.example"}').url
    ).toBe('/upcoming')
    expect(parsePushPayload('{"v":1,"count":2,"url":"/bills"}').url).toBe(
      '/bills'
    )
  })
})
