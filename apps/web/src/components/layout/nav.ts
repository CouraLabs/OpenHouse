import type { LucideIcon } from 'lucide-react'
import { Cuboid, FileText, Settings2, Sparkles } from 'lucide-react'

/**
 * A navigation entry the sidebar renders as a link. The paths are inert
 * placeholders until their pages exist; the shell itself owns no routes.
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

export const PLATFORM_GROUP: NavGroup = {
  key: 'nav.platform',
  items: [
    {
      key: 'nav.playground',
      to: '/playground',
      icon: Sparkles,
      children: [
        { key: 'nav.history', to: '/playground/history' },
        { key: 'nav.starred', to: '/playground/starred' },
        { key: 'nav.settings', to: '/playground/settings' },
      ],
    },
    { key: 'nav.models', to: '/models', icon: Cuboid },
    { key: 'nav.documentation', to: '/documentation', icon: FileText },
    { key: 'nav.settings', to: '/settings', icon: Settings2 },
  ],
}

export const PROJECTS_GROUP: NavGroup = {
  key: 'nav.projects',
  items: [
    { key: 'nav.design-engineering', to: '/projects/design-engineering' },
    { key: 'nav.sales-marketing', to: '/projects/sales-marketing' },
    { key: 'nav.travel', to: '/projects/travel' },
  ],
}
