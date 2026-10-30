import { randomUUID } from 'node:crypto'
import { ANONYMIZED_USER_NAME } from '@workspace/poco'

import { ConflictError, NotFoundError } from '../common/errors.js'
import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import {
  TenantUserRepository,
  type TenantUserRow,
} from './tenant-user.repository.js'

export class TenantUserService {
  constructor(
    private readonly users: TenantUserRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock
  ) {}

  list(tenantId: number): Promise<TenantUserRow[]> {
    return this.users.list(tenantId)
  }

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

    const updated = await this.users.deactivate(tenantId, id)

    if (updated === undefined) {
      throw new ConflictError(
        'A tenant must keep at least one active owner.'
      )
    }

    return updated
  }

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
