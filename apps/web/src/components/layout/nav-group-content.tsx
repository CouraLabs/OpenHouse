import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@workspace/ui/components/sidebar'

import type { NavGroup } from './nav.js'
import { CollapsibleNavItemView } from './collapsible-nav-item.js'
import { NavButtonItem } from './nav-button-item.js'
import { NavSubgroupItems } from './nav-subgroup-items.js'

/**
 * One sidebar section: the group label — larger than the subgroup labels
 * beneath it, and the trigger that folds the section — and its items.
 */
export function NavGroupContent({ group }: { group: NavGroup }) {
  const { t } = useTranslation()

  return (
    <Collapsible defaultOpen render={<SidebarGroup />}>
      <SidebarGroupLabel
        render={<CollapsibleTrigger className="group/group-trigger" />}
        className="h-9 w-full cursor-pointer text-base font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
      >
        {t(group.key)}
        <ChevronRight className="ml-auto transition-transform group-data-[panel-open]/group-trigger:rotate-90" />
      </SidebarGroupLabel>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) =>
              'items' in item ? (
                <NavSubgroupItems key={item.key} subgroup={item} />
              ) : 'children' in item ? (
                <CollapsibleNavItemView key={item.key} item={item} />
              ) : (
                <NavButtonItem key={item.key} item={item} />
              )
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  )
}
