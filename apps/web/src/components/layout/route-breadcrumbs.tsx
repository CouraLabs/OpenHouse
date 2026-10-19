import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'

import { FINANCIAL_GROUP } from './nav.js'
import { findNavTrail } from './nav-trail.js'

/**
 * The breadcrumb trail for the current location: the sidebar's grouping for
 * the page, starting at its group (group, subgroup, item — groups are
 * labels, not links); the last is the current page. A route outside the menu
 * falls back to one entry per path segment, each linking to its own prefix,
 * labeled through i18n with the raw segment as fallback. The home page (no
 * segments) shows a single Home entry. Renders inside a `BreadcrumbList`.
 */
export function RouteBreadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const navTrail = findNavTrail([FINANCIAL_GROUP], location.pathname)

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
