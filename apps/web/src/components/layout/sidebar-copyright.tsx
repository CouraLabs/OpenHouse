import { useTranslation } from 'react-i18next'

/** The copyright line at the very foot of the sidebar, as a mono label. */
export function SidebarCopyright() {
  const { t } = useTranslation()

  return (
    <p className="px-1 font-mono text-[0.72rem] text-muted-foreground">
      {t('sidebar.copyright')}
    </p>
  )
}
