import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'

import { NAV_GROUPS } from './nav.js'
import { findNavTrail } from './nav-trail.js'

export function RouteBreadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const navTrail = findNavTrail(NAV_GROUPS, location.pathname)

  const crumbs: Array<{ label: string; to?: string }> = navTrail
    ? navTrail.map((step) => ({ label: t(step.key), to: step.to }))
    : segments.length === 0
      ? [{ label: t('nav.home'), to: '/' }]
      : segments.map((segment, index) => ({
          label: t(`nav.${segment}`, {
            defaultValue: segment,
          }),
          to: `/${segments.slice(0, index + 1).join('/')}`,
        }))

  return crumbs.map((crumb, index) => {
    const isLast = index === crumbs.length - 1

    return (
      <Fragment key={crumb.to ?? crumb.label}>
        {index > 0 ? <BreadcrumbSeparator className="max-md:hidden" /> : null}
        <BreadcrumbItem className={cn('min-w-0', !isLast && 'max-md:hidden')}>
          {isLast || crumb.to === undefined ? (
            <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
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
