import { randomUUID } from 'node:crypto'
import { ANONYMIZED_USER_NAME } from '@workspace/poco'

import { ConflictError, NotFoundError } from '../common/errors.js'
import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import {
  TenantUserRepository,
  type TenantUserRow,
} from './tenant-user.repository.js'

/**
 * The owner's user management: listing the tenant's users and removing or
 * restoring them. Removal is a deactivation — nothing a user created is
 * deleted, and their name stays on the history they left. A removed member
 * who asks for erasure is anonymized: their identity goes, their rows stay
 * for the household's books.
 */
export class TenantUserService {
  constructor(
    private readonly users: TenantUserRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock
  ) {}

  list(tenantId: number): Promise<TenantUserRow[]> {
    return this.users.list(tenantId)
  }

  /**
   * Removes a user: they are signed out and cannot sign in again until
   * reactivated. An owner cannot remove themself, and a tenant always keeps
   * one active owner.
   */
  async deactivate(
    tenantId: number,
    actingUserId: number,
    id: number
  ): Promise<TenantUserRow> {
    if (id === actingUserId) {
      throw new ConflictError('You cannot remove yourself.')
    }

    const target = await this.users.findById(tenantId, id)
    if (target === undefined) {
      throw new NotFoundError('User not found.')
    }

    // The write carries the guard that keeps the tenant one active owner:
    // removing the last active owner matches no rows, whatever raced it.
    const updated = await this.users.deactivate(tenantId, id)

    if (updated === undefined) {
      throw new ConflictError(
        'A tenant must keep at least one active owner.'
      )
    }

    return updated
  }

  /** Restores a removed user; they sign in again to get a session. */
  async reactivate(tenantId: number, id: number): Promise<TenantUserRow> {
    const target = await this.users.findById(tenantId, id)
    if (target?.anonymizedAt != null) {
      throw new ConflictError('An anonymized member cannot be restored.')
    }

    const updated = await this.users.setActive(tenantId, id, true)
    if (updated === undefined) {
      throw new NotFoundError('User not found.')
    }

    return updated
  }

  /**
   * Anonymizes a removed member at their request (LGPD/GDPR erasure): the
   * name becomes "Former member", the email a random placeholder, the
   * password hash is cleared. The rows they created stay. Only a removed
   * member can be anonymized — an active one is still using the account —
   * and anonymizing twice changes nothing.
   */
  async anonymize(
    tenantId: number,
    actingUserId: number,
    id: number
  ): Promise<TenantUserRow> {
    const target = await this.users.findById(tenantId, id)
    if (target === undefined) {
      throw new NotFoundError('User not found.')
    }
    if (target.anonymizedAt !== null) {
      return target
    }
    if (target.isActive) {
      throw new ConflictError('Remove the member before anonymizing.')
    }

    const updated = await this.users.anonymizeWithAudit(
      tenantId,
      id,
      {
        name: ANONYMIZED_USER_NAME,
        email: `former-member-${randomUUID()}@anonymized.invalid`,
      },
      this.clock.now(),
      this.audit.statement({
        tenantId,
        actorId: actingUserId,
        action: 'member.anonymize',
        details: { userId: id },
      })
    )

    return updated ?? target
  }
}
