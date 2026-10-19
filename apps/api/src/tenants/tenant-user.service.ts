import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import {
  TenantUserRepository,
  type TenantUserRow,
} from './tenant-user.repository.js'

/**
 * The owner's user management: listing the tenant's users and removing or
 * restoring them. Removal is a deactivation — nothing a user created is
 * deleted, and their name stays on the history they left.
 */
@Injectable()
export class TenantUserService {
  constructor(private readonly users: TenantUserRepository) {}

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
      throw new ConflictException('You cannot remove yourself.')
    }

    return this.users.transaction(async (tx) => {
      const target = await this.users.findById(tenantId, id, tx)
      if (target === undefined) {
        throw new NotFoundException('User not found.')
      }

      if (target.role === 'owner' && target.isActive) {
        const owners = await this.users.lockActiveOwnerIds(tenantId, tx)
        if (owners.filter((ownerId) => ownerId !== id).length === 0) {
          throw new ConflictException(
            'A tenant must keep at least one active owner.'
          )
        }
      }

      const updated = await this.users.setActive(tenantId, id, false, tx)

      return updated ?? target
    })
  }

  /** Restores a removed user; they sign in again to get a session. */
  async reactivate(tenantId: number, id: number): Promise<TenantUserRow> {
    const updated = await this.users.setActive(tenantId, id, true)
    if (updated === undefined) {
      throw new NotFoundException('User not found.')
    }

    return updated
  }
}
