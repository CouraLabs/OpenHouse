import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Link,
  PiggyBank,
  Repeat,
  Tags,
  Target,
  Users,
  Wallet,
} from 'lucide-react'

/**
 * A navigation entry the sidebar renders as a link.
 */
export type NavItem = {
  key: string
  to: string
  icon?: LucideIcon
}

/** A navigation entry that expands to reveal nested links. */
export type CollapsibleNavItem = NavItem & { children: NavItem[] }

/** A labeled subsection inside a navigation group. */
export type NavSubgroup = {
  key: string
  items: NavItem[]
}

/** A navigation group: a labeled list of items and subgroups. */
export type NavGroup = {
  key: string
  items: Array<NavItem | CollapsibleNavItem | NavSubgroup>
}

/** The financial records a signed-in user manages, ordered by role: setup, then daily activity, then planning. */
export const FINANCIAL_GROUP: NavGroup = {
  key: 'nav.financial',
  items: [
    {
      key: 'nav.subgroup.setup',
      items: [
        { key: 'nav.accounts', to: '/accounts', icon: Wallet },
        { key: 'nav.categories', to: '/categories', icon: Tags },
        { key: 'nav.receivers', to: '/receivers', icon: Users },
      ],
    },
    {
      key: 'nav.subgroup.activity',
      items: [
        { key: 'nav.transactions', to: '/transactions', icon: ArrowLeftRight },
        {
          key: 'nav.recurring-transactions',
          to: '/recurring-transactions',
          icon: Repeat,
        },
        {
          key: 'nav.transaction-linkers',
          to: '/transaction-linkers',
          icon: Link,
        },
      ],
    },
    {
      key: 'nav.subgroup.planning',
      items: [
        { key: 'nav.limits', to: '/limits', icon: PiggyBank },
        { key: 'nav.goals', to: '/goals', icon: Target },
      ],
    },
  ],
}
