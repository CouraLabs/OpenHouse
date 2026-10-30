import { useTranslation } from 'react-i18next'

import type { NavSubgroup } from './nav.js'
import { NavButtonItem } from './nav-button-item.js'

export function NavSubgroupItems({ subgroup }: { subgroup: NavSubgroup }) {
  const { t } = useTranslation()

  return (
    <>
      <li className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70">
        {t(subgroup.key)}
      </li>
      {subgroup.items.map((item) => (
        <NavButtonItem key={item.key} item={item} />
      ))}
    </>
  )
}
