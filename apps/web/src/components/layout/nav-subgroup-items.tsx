import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@workspace/ui/components/sidebar'

import type { NavSubgroup } from './nav.js'

export function NavSubgroupItems({ subgroup }: { subgroup: NavSubgroup }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const Icon = subgroup.icon
  const holdsActive = subgroup.items.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  )

  return (
    <Collapsible className="group/collapsible" defaultOpen>
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={t(subgroup.key)}
              className={
                holdsActive ? 'text-sidebar-accent-foreground' : undefined
              }
            >
              <Icon />
              <span>{t(subgroup.key)}</span>
              <ChevronRight className="ml-auto size-4! text-sidebar-muted transition-transform duration-150 group-data-[panel-open]/menu-button:rotate-90" />
            </SidebarMenuButton>
          }
        />
        <CollapsibleContent>
          <SidebarMenuSub>
            {subgroup.items.map((item) => (
              <SidebarMenuSubItem key={item.key}>
                <SidebarMenuSubButton
                  render={<Link to={item.to} />}
                  className="data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground data-[status=active]:before:opacity-100"
                >
                  <span>{t(item.key)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
