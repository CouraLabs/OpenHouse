import type { SessionUser } from '@workspace/dto'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
} from '@workspace/ui/components/sidebar'

import { BrandHeader } from './brand-header.js'
import { MonthSummaryFooter } from './month-summary-footer.js'
import { NavButtonItem } from './nav-button-item.js'
import { NavGroupContent } from './nav-group-content.js'
import { DASHBOARD_ITEM, NAV_GROUPS } from './nav.js'

export function AppSidebar({
  tenantName,
  user,
}: {
  tenantName: string
  user: SessionUser
}) {
  return (
    <Sidebar variant="floating" collapsible="offcanvas">
      <BrandHeader tenantName={tenantName} />
      <SidebarContent className="gap-1">
        <SidebarGroup>
          <SidebarMenu>
            <NavButtonItem item={DASHBOARD_ITEM} />
          </SidebarMenu>
        </SidebarGroup>
        {NAV_GROUPS.map((group) => (
          <NavGroupContent key={group.key} group={group} />
        ))}
      </SidebarContent>
      <MonthSummaryFooter user={user} />
    </Sidebar>
  )
}
