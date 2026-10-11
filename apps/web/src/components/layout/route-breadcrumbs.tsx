import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'

/**
 * The breadcrumb trail for the current location: `Home` first, then one entry
 * per path segment, each linking to its own prefix; the last is the current
 * page. Segment labels go through i18n and fall back to the raw segment.
 * Renders inside a `BreadcrumbList`.
 */
export function RouteBreadcrumbs() {
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
