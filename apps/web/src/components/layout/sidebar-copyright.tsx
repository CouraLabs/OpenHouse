import { useTranslation } from 'react-i18next'

export function SidebarCopyright() {
  const { t } = useTranslation()

  return (
    <p className="px-1 font-mono text-[0.72rem] text-muted-foreground">
      {t('sidebar.copyright')}
    </p>
  )
}
