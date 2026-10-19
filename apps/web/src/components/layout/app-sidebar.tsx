import { Sidebar, SidebarContent } from '@workspace/ui/components/sidebar'

import { BrandHeader } from './brand-header.js'
import { MonthSummaryFooter } from './month-summary-footer.js'
import { NavGroupContent } from './nav-group-content.js'
import { FINANCIAL_GROUP } from './nav.js'

/**
 * The signed-in application sidebar: the brand, the grouped navigation, and
 * this month's income and expenses at its foot. Renders inside
 * `SidebarProvider`; owns no page content.
 */
export function AppSidebar({ tenantName }: { tenantName: string }) {
  return (
    <Sidebar variant="inset">
      <BrandHeader tenantName={tenantName} />
      <SidebarContent>
        <NavGroupContent group={FINANCIAL_GROUP} />
      </SidebarContent>
      <MonthSummaryFooter />
    </Sidebar>
  )
}
