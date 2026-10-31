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

export function AppSidebar({ tenantName }: { tenantName: string }) {
  return (
    <Sidebar variant="inset">
      <BrandHeader tenantName={tenantName} />
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarMenu>
            <NavButtonItem item={DASHBOARD_ITEM} />
          </SidebarMenu>
        </SidebarGroup>
        {NAV_GROUPS.map((group) => (
          <NavGroupContent key={group.key} group={group} />
        ))}
      </SidebarContent>
      <MonthSummaryFooter />
    </Sidebar>
  )
}
