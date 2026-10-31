import { Link, useLocation } from '@tanstack/react-router'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import { NAV_GROUPS } from './nav.js'
import { findNavTrail } from './nav-trail.js'

export function PageTrail() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const found = findNavTrail(NAV_GROUPS, pathname) ?? []
  const trail = found.at(-1)?.to === pathname ? found.slice(0, -1) : found

  if (trail.length === 0) {
    return null
  }

  return (
    <nav aria-label={t('shell.breadcrumb')}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
        {trail.map((step, index) => (
          <Fragment key={step.key}>
            {index > 0 ? (
              <li aria-hidden className="text-foreground/25">
                /
              </li>
            ) : null}
            <li>
              {step.to !== undefined ? (
                <Link
                  to={step.to}
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  {t(step.key)}
                </Link>
              ) : (
                t(step.key)
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
