import { inArray, lt, sql } from 'drizzle-orm'

import type { Database } from '@workspace/db'
import { signInAttempts } from '@workspace/db'
import { runBatch } from '../common/ledger/ledger-batch.js'

export class SignInAttemptRepository {
  constructor(private readonly db: Database) {}

  async touch(keys: string[], now: Date): Promise<Array<Date | null>> {
    const [previous] = (await runBatch(this.db, [
      this.db
        .select()
        .from(signInAttempts)
        .where(inArray(signInAttempts.key, keys)),
      this.db
        .insert(signInAttempts)
        .values(keys.map((key) => ({ key, lastAttemptAt: now })))
        .onConflictDoUpdate({
          target: signInAttempts.key,
          set: { lastAttemptAt: sql`excluded.last_attempt_at` },
        }),
    ])) as [Array<{ key: string; lastAttemptAt: Date }>, unknown]

    return keys.map(
      (key) => previous.find((row) => row.key === key)?.lastAttemptAt ?? null
    )
  }

  async deleteOlderThan(cutoff: Date): Promise<void> {
    await this.db
      .delete(signInAttempts)
      .where(lt(signInAttempts.lastAttemptAt, cutoff))
  }
}
