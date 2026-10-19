import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { users } from '@workspace/db'

/** The preference columns of a user row. */
export interface PreferencesRow {
  startPage: string
}

/**
 * The preference columns of the user rows. Every method takes the tenant id
 * explicitly, alongside the user, so a write never crosses tenants.
 */
@Injectable()
export class PreferencesRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Saves a user's preferences. */
  async update(
    tenantId: number,
    userId: number,
    data: PreferencesRow
  ): Promise<PreferencesRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
      .returning({ startPage: users.startPage })

    return row
  }
}
