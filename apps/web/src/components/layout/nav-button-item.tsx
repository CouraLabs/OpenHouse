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
        tooltip={t(item.key)}
        render={
          <Link to={item.to} activeOptions={{ exact: item.to === '/' }} />
        }
        className="data-[status=active]:bg-sidebar-primary data-[status=active]:font-semibold data-[status=active]:text-sidebar-primary-foreground"
      >
        {Icon ? <Icon /> : null}
        <span>{t(item.key)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
