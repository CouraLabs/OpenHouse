import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  CalendarClock,
  HeartHandshake,
  LayoutDashboard,
  Lightbulb,
  Link,
  PiggyBank,
  ReceiptText,
  Repeat,
  Settings,
  Tags,
  Target,
  Users,
  Wallet,
} from 'lucide-react'

export type NavItem = {
  key: string
  to: string
  icon?: LucideIcon
}

export type CollapsibleNavItem = NavItem & { children: NavItem[] }

export type NavSubgroup = {
  key: string
  items: NavItem[]
}

export type NavGroup = {
  key: string
  items: Array<NavItem | CollapsibleNavItem | NavSubgroup>
}

export const DASHBOARD_ITEM: NavItem = {
  key: 'nav.dashboard',
  to: '/',
  icon: LayoutDashboard,
}

export const FINANCIAL_GROUP: NavGroup = {
  key: 'nav.financial',
  items: [
    {
      key: 'nav.subgroup.activity',
      items: [
        { key: 'nav.transactions', to: '/transactions', icon: ArrowLeftRight },
        { key: 'nav.upcoming', to: '/upcoming', icon: CalendarClock },
        { key: 'nav.bills', to: '/bills', icon: ReceiptText },
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
      key: 'nav.subgroup.setup',
      items: [
        { key: 'nav.accounts', to: '/accounts', icon: Wallet },
        { key: 'nav.categories', to: '/categories', icon: Tags },
        { key: 'nav.receivers', to: '/receivers', icon: Users },
      ],
    },
    {
      key: 'nav.subgroup.planning',
      items: [
        { key: 'nav.limits', to: '/limits', icon: PiggyBank },
        { key: 'nav.goals', to: '/goals', icon: Target },
        { key: 'nav.tips', to: '/tips', icon: Lightbulb },
      ],
    },
  ],
}

export const HOME_GROUP: NavGroup = {
  key: 'nav.your-home',
  items: [
    { key: 'nav.household', to: '/household', icon: HeartHandshake },
    { key: 'nav.settings', to: '/settings', icon: Settings },
  ],
}

export const NAV_GROUPS: NavGroup[] = [FINANCIAL_GROUP, HOME_GROUP]
