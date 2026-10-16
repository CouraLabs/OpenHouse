import { useTranslation } from 'react-i18next'

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

/** One sidebar section: the group label and its items. */
export function NavGroupContent({ group }: { group: NavGroup }) {
  const { t } = useTranslation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t(group.key)}</SidebarGroupLabel>
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
    </SidebarGroup>
  )
}
