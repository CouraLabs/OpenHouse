import type { TenantUser } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { RotateCcw, UserMinus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** What the actions column can do to a row, reported upward. */
export interface UserRowActions {
  onRemove: (user: TenantUser) => void
  onReactivate: (user: TenantUser) => void
}

/**
 * The columns the users table shows: name, email, role, status, the day
 * they joined, and the row actions. The acting owner's own row carries no
 * remove action — an owner cannot remove themself. Called during the
 * page's render, so the labels arrive translated.
 */
export function buildUserColumns(
  t: (key: string) => string,
  format: { locale: string; timeZone: string },
  currentUserId: number,
  actions: UserRowActions
): Array<DataTableColumn<TenantUser>> {
  const joined = new Intl.DateTimeFormat(format.locale, {
    dateStyle: 'medium',
    timeZone: format.timeZone,
  })

  return [
    {
      accessorKey: 'name',
      header: t('settings.users.name'),
      enableSorting: false,
    },
    {
      accessorKey: 'email',
      header: t('settings.users.email'),
      enableSorting: false,
    },
    {
      id: 'role',
      header: t('settings.users.role'),
      enableSorting: false,
      cell: (context) => t(`settings.users.role-${context.row.original.role}`),
    },
    {
      id: 'status',
      header: t('settings.users.status'),
      enableSorting: false,
      cell: (context) =>
        context.row.original.isActive ? (
          <Badge variant="secondary">{t('settings.users.active')}</Badge>
        ) : (
          <Badge variant="destructive">{t('settings.users.removed')}</Badge>
        ),
    },
    {
      id: 'createdAt',
      header: t('settings.users.created'),
      enableSorting: false,
      cell: (context) =>
        joined.format(new Date(context.row.original.createdAt)),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) =>
        context.row.original.id === currentUserId ? null : (
          <UserActionsCell user={context.row.original} actions={actions} />
        ),
    },
  ]
}

/** The actions cell: remove an active user, reactivate a removed one. */
function UserActionsCell({
  user,
  actions,
}: {
  user: TenantUser
  actions: UserRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      {user.isActive ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label={t('settings.users.remove')}
          title={t('settings.users.remove')}
          onClick={() => actions.onRemove(user)}
        >
          <UserMinus />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('settings.users.reactivate')}
          title={t('settings.users.reactivate')}
          onClick={() => actions.onReactivate(user)}
        >
          <RotateCcw />
        </Button>
      )}
    </div>
  )
}
