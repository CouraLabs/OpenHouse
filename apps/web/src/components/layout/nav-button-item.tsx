import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@workspace/ui/components/sidebar'

import type { NavItem } from './nav.js'

export function NavButtonItem({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link to={item.to} activeOptions={{ exact: true }} />}
        className="data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground"
      >
        {Icon ? <Icon /> : null}
        <span>{t(item.key)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
