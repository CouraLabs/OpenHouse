import { House } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SidebarHeader } from '@workspace/ui/components/sidebar'

/** The non-interactive brand block: logo mark, app name, tenant name. */
export function BrandHeader({ tenantName }: { tenantName: string }) {
  const { t } = useTranslation()

  return (
    <SidebarHeader>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
          <House className="size-4" />
        </div>
        <div className="grid flex-1 leading-tight">
          <span className="truncate font-semibold">{t('app.name')}</span>
          <span className="text-muted-foreground truncate text-xs">
            {tenantName}
          </span>
        </div>
      </div>
    </SidebarHeader>
  )
}
