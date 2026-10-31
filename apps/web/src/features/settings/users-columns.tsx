import type { TenantUser } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Download, KeyRound, RotateCcw, UserMinus, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface UserRowActions {
  onRemove: (user: TenantUser) => void
  onReactivate: (user: TenantUser) => void
  onResetPassword: (user: TenantUser) => void
  onExport: (user: TenantUser) => void
  onAnonymize: (user: TenantUser) => void
}

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
        ) : context.row.original.anonymizedAt !== null ? (
          <Badge variant="outline">{t('settings.users.anonymized')}</Badge>
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
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('settings.users.export-data')}
        title={t('settings.users.export-data')}
        onClick={() => actions.onExport(user)}
      >
        <Download />
      </Button>
      {user.isActive && user.role === 'user' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('settings.users.reset-password')}
          title={t('settings.users.reset-password')}
          onClick={() => actions.onResetPassword(user)}
        >
          <KeyRound />
        </Button>
      ) : null}
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
      ) : user.anonymizedAt === null ? (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('settings.users.reactivate')}
            title={t('settings.users.reactivate')}
            onClick={() => actions.onReactivate(user)}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            aria-label={t('settings.users.anonymize')}
            title={t('settings.users.anonymize')}
            onClick={() => actions.onAnonymize(user)}
          >
            <UserX />
          </Button>
        </>
      ) : null}
    </div>
  )
}
