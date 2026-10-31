import { bill, limit, preferences, rule } from './reminder-fixtures.js'
import { dueReminders, type ReminderInput } from './reminder-rules.js'

function input(overrides: Partial<ReminderInput>): ReminderInput {
  return {
    today: '2026-11-02',
    preferences: preferences(),
    bills: [],
    rules: [],
    generatedToday: new Set(),
    limits: [],
    ...overrides,
  }
}

const keysOf = (candidates: ReturnType<typeof dueReminders>) =>
  candidates.map(({ key }) => `${key.kind}:${key.refId}:${key.dueDate}`)

describe('bill reminders', () => {
  it('fire from the lead time before the due date, not earlier', () => {
    const bills = [bill({ dueDate: '2026-11-05' })]

    expect(dueReminders(input({ bills, today: '2026-11-01' }))).toEqual([])
    expect(keysOf(dueReminders(input({ bills, today: '2026-11-02' })))).toEqual(
      ['bill_due:7:2026-11-05']
    )
    expect(
      dueReminders(input({ bills, today: '2026-11-05' }))[0]?.detail
    ).toMatchObject({ kind: 'bill_due', daysLeft: 0 })
  })

  it('honor a longer lead time from the preferences', () => {
    const bills = [bill({ dueDate: '2026-11-05' })]

    expect(
      keysOf(
        dueReminders(
          input({
            bills,
            today: '2026-10-30',
            preferences: preferences({ billLeadDays: 7 }),
          })
        )
      )
    ).toEqual(['bill_due:7:2026-11-05'])
  })

  it('wait for an Open bill to close and skip a bill with nothing due', () => {
    expect(dueReminders(input({ bills: [bill({ status: 'Open' })] }))).toEqual(
      []
    )
    expect(
      dueReminders(input({ bills: [bill({ amountDue: '0.00' })] }))
    ).toEqual([])
  })

  it('alert an Overdue bill under a key that never changes', () => {
    const overdue = bill({ status: 'Overdue', dueDate: '2026-10-30' })

    const first = dueReminders(input({ bills: [overdue], today: '2026-11-01' }))
    const later = dueReminders(input({ bills: [overdue], today: '2026-11-20' }))

    expect(keysOf(first)).toEqual(['bill_overdue:7:2026-10-30'])
    expect(keysOf(later)).toEqual(keysOf(first))
  })
})

describe('recurring reminders', () => {
  it('fire the lead time before the rule, for expenses only', () => {
    const rules = [
      rule({ id: 1, frequencyDay: 3 }),
      rule({ id: 2, frequencyDay: 3, type: 'Income' }),
      rule({ id: 3, frequencyDay: 20 }),
    ]

    expect(keysOf(dueReminders(input({ rules })))).toEqual([
      'recurring_due:1:2026-11-03',
    ])
  })

  it('skip Daily rules and what a rule already generated today', () => {
    const rules = [
      rule({ id: 1, frequency: 'Daily', frequencyDay: null }),
      rule({ id: 2, frequencyDay: 2 }),
    ]

    expect(
      dueReminders(input({ rules, generatedToday: new Set([2]) }))
    ).toEqual([])
  })
})

describe('limit alerts', () => {
  it('alert at 80% and 100%, keyed by the period start', () => {
    expect(
      keysOf(dueReminders(input({ limits: [limit({ spent: '800.00' })] })))
    ).toEqual(['limit_80:3:2026-11-01'])
    expect(
      keysOf(dueReminders(input({ limits: [limit({ spent: '1000.00' })] })))
    ).toEqual(['limit_100:3:2026-11-01'])
    expect(
      dueReminders(input({ limits: [limit({ spent: '799.99' })] }))
    ).toEqual([])
  })

  it('send the highest enabled threshold only', () => {
    const crossed = [limit({ spent: '1200.00' })]

    expect(
      keysOf(
        dueReminders(
          input({
            limits: crossed,
            preferences: preferences({ limitAlert100: false }),
          })
        )
      )
    ).toEqual(['limit_80:3:2026-11-01'])
    expect(
      dueReminders(
        input({
          limits: crossed,
          preferences: preferences({
            limitAlert80: false,
            limitAlert100: false,
          }),
        })
      )
    ).toEqual([])
  })

  it('alert again in the next period', () => {
    const spent = [limit({ spent: '900.00' })]

    expect(
      keysOf(dueReminders(input({ limits: spent, today: '2026-12-01' })))
    ).toEqual(['limit_80:3:2026-12-01'])
  })
})
