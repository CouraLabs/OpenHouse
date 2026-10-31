import { Link } from '@tanstack/react-router'

import { BrandMark } from '@workspace/ui/components/brand-mark'
import { SidebarHeader } from '@workspace/ui/components/sidebar'

import { BrandName } from './brand-name.js'

export function BrandHeader({ tenantName }: { tenantName: string }) {
  return (
    <SidebarHeader className="pt-4 pb-2">
      <Link
        to="/"
        className="flex items-center gap-3 rounded-2xl px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <BrandMark />
        <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <BrandName className="truncate text-[1.0625rem] text-sidebar-foreground" />
          <span className="truncate text-xs text-sidebar-muted">
            {tenantName}
          </span>
        </div>
      </Link>
    </SidebarHeader>
  )
}
