import { and, eq } from 'drizzle-orm'
import type { Database } from '../../database.js'
import { users } from '../../schema.js'

export interface PreferencesRow {
  startPage: string
}

export class PreferencesRepository {
  constructor(private readonly db: Database) {}

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
