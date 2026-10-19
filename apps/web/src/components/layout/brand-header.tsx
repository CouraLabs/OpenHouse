import { useTranslation } from 'react-i18next'

import { BrandMark } from '@workspace/ui/components/brand-mark'
import { SidebarHeader } from '@workspace/ui/components/sidebar'

/** The non-interactive brand block: logo mark, app name, tenant name. */
export function BrandHeader({ tenantName }: { tenantName: string }) {
  const { t } = useTranslation()

  return (
    <SidebarHeader>
      <div className="flex items-center gap-3 px-2 py-2">
        <BrandMark />
        <div className="grid flex-1 leading-tight">
          <span className="truncate font-heading text-lg tracking-tight">
            {t('app.name')}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {tenantName}
          </span>
        </div>
      </div>
    </SidebarHeader>
  )
}
