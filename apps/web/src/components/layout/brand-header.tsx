import { Link } from '@tanstack/react-router'

import { BrandMark } from '@workspace/ui/components/brand-mark'
import { SidebarHeader } from '@workspace/ui/components/sidebar'

import { BrandName } from './brand-name.js'

/** The brand block, linking home: logo mark, app name, tenant name. */
export function BrandHeader({ tenantName }: { tenantName: string }) {
  return (
    <SidebarHeader>
      <Link
        to="/"
        className="flex items-center gap-3 rounded-md px-2 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <BrandMark />
        <div className="grid flex-1 leading-tight">
          <BrandName className="truncate text-lg tracking-[-0.01em]" />
          <span className="truncate text-xs text-muted-foreground">
            {tenantName}
          </span>
        </div>
      </Link>
    </SidebarHeader>
  )
}
