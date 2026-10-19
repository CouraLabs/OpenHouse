import { describe, expect, it } from 'vitest'

import { FINANCIAL_GROUP } from './nav.js'
import { findNavTrail } from './nav-trail.js'

describe('findNavTrail', () => {
  it('walks group, subgroup, then item', () => {
    expect(findNavTrail([FINANCIAL_GROUP], '/accounts')).toEqual([
      { key: 'nav.financial' },
      { key: 'nav.subgroup.setup' },
      { key: 'nav.accounts', to: '/accounts' },
    ])
  })

  it('follows the menu grouping, not the url segments', () => {
    expect(findNavTrail([FINANCIAL_GROUP], '/tips/rent-vs-buy')).toEqual([
      { key: 'nav.financial' },
      { key: 'nav.subgroup.tips' },
      { key: 'nav.rent-vs-buy', to: '/tips/rent-vs-buy' },
    ])
  })

  it('walks a collapsible parent before its child', () => {
    const group = {
      key: 'g',
      items: [
        {
          key: 'parent',
          to: '/parent',
          children: [{ key: 'child', to: '/parent/child' }],
        },
      ],
    }
    expect(findNavTrail([group], '/parent/child')).toEqual([
      { key: 'g' },
      { key: 'parent', to: '/parent' },
      { key: 'child', to: '/parent/child' },
    ])
  })

  it('gives a detail page the trail of the item above it', () => {
    expect(findNavTrail([FINANCIAL_GROUP], '/bills/12')).toEqual([
      { key: 'nav.financial' },
      { key: 'nav.subgroup.activity' },
      { key: 'nav.bills', to: '/bills' },
    ])
  })

  it('returns undefined for routes outside the menu', () => {
    expect(findNavTrail([FINANCIAL_GROUP], '/settings/general')).toBeUndefined()
  })
})
