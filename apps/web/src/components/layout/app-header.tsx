import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { Separator } from '@workspace/ui/components/separator'
import { SidebarTrigger } from '@workspace/ui/components/sidebar'

import { ThemeSwitcher, LocaleSwitcher } from '@/components/layout/switchers.js'

/**
 * The application top bar: sidebar trigger and breadcrumb on the left, theme
 * and language switchers on the right. Renders inside `SidebarInset`.
 */
export function AppHeader() {
  return (
    <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 self-center!" />
      <Breadcrumb>
        <BreadcrumbList>
          <RouteBreadcrumbs />
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-1">
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
    </header>
  )
}

/**
 * The breadcrumb trail for the current location: `Home` first, then one entry
 * per path segment, each linking to its own prefix; the last is the current
 * page. Segment labels go through i18n and fall back to the raw segment.
 */
function RouteBreadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  const crumbs: Array<{ label: string; to?: string }> = [
    { label: t('breadcrumb.home'), to: '/' },
    ...segments.map((segment, index) => ({
      label: t(`nav.${segment}`, {
        defaultValue: segment,
      }),
      to: `/${segments.slice(0, index + 1).join('/')}`,
    })),
  ]

  return crumbs.map((crumb, index) => {
    const isLast = index === crumbs.length - 1

    return (
      <Fragment key={crumb.to ?? crumb.label}>
        {index > 0 ? <BreadcrumbSeparator /> : null}
        <BreadcrumbItem>
          {isLast || crumb.to === undefined ? (
            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link to={crumb.to} />}>
              {crumb.label}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      </Fragment>
    )
  })
}

