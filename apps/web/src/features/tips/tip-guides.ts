/**
 * The tip guides the Tips page renders, adapted from Mobills' personal
 * finance infographics. Pure content: every user-facing string lives in
 * the locale files under `tips.` — this module only declares the shape.
 */
export type TipItem = {
  /** The item's locale key, under `tips.<guide>.items.` */
  key: string
  /** When the item is a fixed share of income, its percentage (the six jars). */
  percent?: number
}

export type TipGuide = {
  /** The guide's locale key, under `tips.` */
  key: string
  items: TipItem[]
}

export const TIP_GUIDES: TipGuide[] = [
  {
    key: 'ten-tips',
    items: [
      { key: 'track-expenses' },
      { key: 'goals' },
      { key: 'budget' },
      { key: 'pay-yourself-first' },
      { key: 'cut-expenses' },
      { key: 'impulse' },
      { key: 'installments' },
      { key: 'emergency-fund' },
      { key: 'review' },
      { key: 'tool' },
    ],
  },
  {
    key: 'save-money',
    items: [
      { key: 'goal' },
      { key: 'numbers' },
      { key: 'cut' },
      { key: 'save-first' },
      { key: 'automate' },
      { key: 'extra-income' },
      { key: 'progress' },
    ],
  },
  {
    key: 'six-jars',
    items: [
      { key: 'necessities', percent: 55 },
      { key: 'freedom', percent: 10 },
      { key: 'education', percent: 10 },
      { key: 'savings', percent: 10 },
      { key: 'fun', percent: 10 },
      { key: 'giving', percent: 5 },
    ],
  },
  {
    key: 'organize-strategy',
    items: [
      { key: 'map' },
      { key: 'debts' },
      { key: 'cut' },
      { key: 'reserve' },
      { key: 'goals' },
      { key: 'monitor' },
    ],
  },
]
