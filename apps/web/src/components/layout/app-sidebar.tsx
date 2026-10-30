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
import { DASHBOARD_ITEM, FINANCIAL_GROUP } from './nav.js'

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
        <NavGroupContent group={FINANCIAL_GROUP} />
      </SidebarContent>
      <MonthSummaryFooter />
    </Sidebar>
  )
}
