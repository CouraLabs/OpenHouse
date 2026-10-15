import type { LucideIcon } from 'lucide-react'
import { ArrowLeftRight, Link, PiggyBank, Repeat, Tags, Target, Users, Wallet } from 'lucide-react'

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

/** A navigation group: a labeled list of items. */
export type NavGroup = {
  key: string
  items: Array<NavItem | CollapsibleNavItem>
}

/** The financial records a signed-in user manages. */
export const FINANCIAL_GROUP: NavGroup = {
  key: 'nav.financial',
  items: [
    { key: 'nav.transactions', to: '/transactions', icon: ArrowLeftRight },
    { key: 'nav.categories', to: '/categories', icon: Tags },
    { key: 'nav.receivers', to: '/receivers', icon: Users },
    { key: 'nav.transaction-linkers', to: '/transaction-linkers', icon: Link },
    { key: 'nav.recurring-transactions', to: '/recurring-transactions', icon: Repeat },
    { key: 'nav.limits', to: '/limits', icon: PiggyBank },
    { key: 'nav.goals', to: '/goals', icon: Target },
    { key: 'nav.accounts', to: '/accounts', icon: Wallet },
  ],
}
