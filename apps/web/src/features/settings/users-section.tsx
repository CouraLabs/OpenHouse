import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { compareMoney, type InviteCode, type TenantUser } from '@workspace/poco'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { Button } from '@workspace/ui/components/button'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'
import { DataTable } from '@workspace/ui/components/data-table'
import { UserPlus } from 'lucide-react'

import { useSession } from '@/lib/auth.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMemberBalanceCheck } from '@/lib/household.js'
import { useTenantSettings } from '@/lib/settings.js'
import { AddUserDialog } from './add-user-dialog.js'
import { MemberExportDialog } from './member-export-dialog.js'
import { PendingInvites } from './pending-invites.js'
import { ResetCodeDialog } from './reset-code-dialog.js'
import {
  isPendingInvite,
  useInviteCodes,
  useRevokeInviteCode,
} from './use-invite-codes.js'
import {
  useAnonymizeUser,
  useSetUserActive,
  useTenantUsers,
} from './use-tenant-users.js'
import { buildUserColumns } from './users-columns.js'

/** The table never sorts; the API answers oldest first. */
const NO_SORTING: SortingState = []

/**
 * The owner's Users section: the tenant's users with reset password,
 * remove, and reactivate, the Add user dialog that issues an invite, and
 * the invitations still pending. Removing confirms first; nothing a removed
 * user created is lost.
 */
export function UsersSection() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const { timezone } = useTenantSettings()
  const users = useTenantUsers()
  const invites = useInviteCodes()
  const setActive = useSetUserActive()
  const anonymize = useAnonymizeUser()
  const balanceCheck = useMemberBalanceCheck()
  const revoke = useRevokeInviteCode()

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<TenantUser | null>(null)
  const [resetting, setResetting] = useState<TenantUser | null>(null)
  const [exporting, setExporting] = useState<TenantUser | null>(null)
  const [anonymizing, setAnonymizing] = useState<TenantUser | null>(null)

  const columns = useMemo(
    () =>
      buildUserColumns(
        t,
        { locale: i18n.language, timeZone: timezone },
        session.data?.user.id ?? 0,
        {
          onRemove: (user) => {
            setActive.reset()
            // Removal is never blocked, but a balance is worth a warning.
            balanceCheck.mutate(user.id)
            setRemoving(user)
          },
          onReactivate: (user) =>
            setActive.mutate({ id: user.id, active: true }),
          onResetPassword: setResetting,
          onExport: setExporting,
          onAnonymize: (user) => {
            anonymize.reset()
            setAnonymizing(user)
          },
        }
      ),
    [
      t,
      i18n.language,
      timezone,
      session.data?.user.id,
      setActive.reset,
      setActive.mutate,
      balanceCheck.mutate,
      anonymize.reset,
    ]
  )

  // The list is small and whole; the table pages it client-side.
  const allUsers = users.data ?? []
  const page = allUsers.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  )

  const now = new Date()
  const pending = (invites.data ?? []).filter((invite) =>
    isPendingInvite(invite, now)
  )
  const expiryFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  })

  const actionError = [setActive, revoke, anonymize].find(
    (mutation) => mutation.isError
  )?.error

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-xl font-light tracking-tight">
              {t('settings.users.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('settings.users.description')}
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <UserPlus />
            {t('settings.users.add')}
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={page}
          total={allUsers.length}
          isLoading={users.isPending}
          sorting={NO_SORTING}
          onSortingChange={() => {}}
          pagination={pagination}
          onPaginationChange={setPagination}
          emptyMessage={t('settings.users.empty')}
          paginationLabels={{
            rowsPerPage: t('settings.users.rows-per-page'),
            page: (current, count) =>
              t('settings.users.page-of', { page: current, count }),
            previous: t('settings.users.previous-page'),
            next: t('settings.users.next-page'),
          }}
        />
        {actionError !== undefined ? (
          <p className="text-sm text-destructive">
            {actionError instanceof Error
              ? actionError.message
              : t('settings.error')}
          </p>
        ) : null}
      </section>
      <PendingInvites
        invites={pending}
        formatExpiry={(expiresAt) => expiryFormat.format(new Date(expiresAt))}
        onRevoke={(invite: InviteCode) => revoke.mutate(invite.id)}
        isRevoking={revoke.isPending}
      />
      <AddUserDialog open={adding} onClose={() => setAdding(false)} />
      <ResetCodeDialog user={resetting} onClose={() => setResetting(null)} />
      <MemberExportDialog user={exporting} onClose={() => setExporting(null)} />
      <ConfirmDialog
        open={anonymizing !== null}
        destructive
        title={t('settings.users.anonymize-title')}
        description={t('settings.users.anonymize-description', {
          name: anonymizing?.name ?? '',
        })}
        confirmLabel={t('settings.users.anonymize-confirm')}
        pendingLabel={t('settings.users.anonymizing')}
        cancelLabel={t('settings.cancel')}
        isPending={anonymize.isPending}
        onCancel={() => {
          setAnonymizing(null)
          anonymize.reset()
        }}
        onConfirm={() => {
          if (anonymizing !== null) {
            anonymize.mutate(anonymizing.id, {
              onSuccess: () => setAnonymizing(null),
            })
          }
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        destructive
        title={t('settings.users.remove-title')}
        description={[
          t('settings.users.remove-description', {
            name: removing?.name ?? '',
          }),
          ...(balanceCheck.data?.lines ?? []).map((line) =>
            compareMoney(line.balance, '0') < 0
              ? t('settings.users.remove-owes', {
                  name: removing?.name ?? '',
                  amount: formatMoney(
                    line.balance.replace('-', ''),
                    i18n.language,
                    line.currency
                  ),
                })
              : t('settings.users.remove-owed', {
                  name: removing?.name ?? '',
                  amount: formatMoney(
                    line.balance,
                    i18n.language,
                    line.currency
                  ),
                })
          ),
        ].join(' ')}
        confirmLabel={t('settings.users.remove-confirm')}
        pendingLabel={t('settings.users.removing')}
        cancelLabel={t('settings.cancel')}
        isPending={setActive.isPending}
        onCancel={() => {
          setRemoving(null)
          setActive.reset()
        }}
        onConfirm={() => {
          if (removing !== null) {
            setActive.mutate(
              { id: removing.id, active: false },
              { onSuccess: () => setRemoving(null) }
            )
          }
        }}
      />
    </div>
  )
}
