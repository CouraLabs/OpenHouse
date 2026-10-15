import { Sidebar, SidebarContent } from '@workspace/ui/components/sidebar'
import type { SessionUser } from '@workspace/poco'

import { BrandHeader } from './brand-header.js'
import { NavGroupContent } from './nav-group-content.js'
import { FINANCIAL_GROUP } from './nav.js'
import { UserFooter } from './user-footer.js'

/**
 * The signed-in application sidebar: the brand, the grouped navigation, and
 * the user menu. Renders inside `SidebarProvider`; owns no page content.
 */
export function AppSidebar({
  user,
  tenantName,
}: {
  user: SessionUser
  tenantName: string
}) {
  return (
    <Sidebar>
      <BrandHeader tenantName={tenantName} />
      <SidebarContent>
        <NavGroupContent group={FINANCIAL_GROUP} />
      </SidebarContent>
      <UserFooter user={user} />
    </Sidebar>
  )
}
