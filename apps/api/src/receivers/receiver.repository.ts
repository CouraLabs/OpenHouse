import { and, asc, count, eq, ilike } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Receiver, Database } from '@workspace/db'
import { receivers } from '@workspace/db'
import type { SearchReceiversArgs } from '@workspace/poco'

import { buildPagedQuery } from '../common/search/fetch.helper.js'
import { escapeLikePattern } from '../common/search/fetch.helper.js'

/** What a search answers with: the page's rows and how many match in all. */
export interface ReceiverSearch {
  rows: Receiver[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface ReceiverWrite {
  name: string
  type: Receiver['type']
}

/**
 * The receiver rows, reached only through the tenant of the session. Every
 * method takes the tenant id explicitly — the repository never decides who
 * is asking. A receiver carries its display name itself; there is nothing
 * to join on.
 */
@Injectable()
export class ReceiverRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Inserts a receiver, stamping the audit trail with the acting user. */
  async insert(
    tenantId: number,
    userId: number,
    data: ReceiverWrite
  ): Promise<Receiver> {
    const [row] = await this.db
      .insert(receivers)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
      })
      .returning()

    return row
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
  async search(
    tenantId: number,
    args: SearchReceiversArgs
  ): Promise<ReceiverSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      name: receivers.name,
      type: receivers.type,
      createdDt: receivers.createdDt,
      updateDt: receivers.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(receivers)
        .where(query.where)
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
        .orderBy(...query.orderBy, asc(receivers.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(receivers).where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Reads one receiver of the tenant — deleted rows included. */
  async findById(tenantId: number, id: number): Promise<Receiver | undefined> {
    const [row] = await this.db
      .select()
      .from(receivers)
      .where(and(eq(receivers.tenantId, tenantId), eq(receivers.id, id)))

    return row
  }

  /** Updates a receiver's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: ReceiverWrite
  ): Promise<Receiver | undefined> {
    const [row] = await this.db
      .update(receivers)
      .set({
        name: data.name,
        type: data.type,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(receivers.tenantId, tenantId), eq(receivers.id, id)))
      .returning()

    return row
  }

  /** Soft-deletes a receiver: a status change, stamped like any update. */
  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Receiver | undefined> {
    const [row] = await this.db
      .update(receivers)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(and(eq(receivers.tenantId, tenantId), eq(receivers.id, id)))
      .returning()

    return row
  }

  /** Lists the tenant's ACTIVE receivers by name, for pickers. */
  async listActive(tenantId: number): Promise<Receiver[]> {
    return this.db
      .select()
      .from(receivers)
      .where(and(eq(receivers.tenantId, tenantId), eq(receivers.status, 'ACTIVE')))
      .orderBy(asc(receivers.name))
  }

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchReceiversArgs) {
    const conditions = [eq(receivers.tenantId, tenantId)]

    if (args.filter.name !== undefined) {
      conditions.push(
        ilike(receivers.name, `%${escapeLikePattern(args.filter.name)}%`)
      )
    }

    if (args.filter.type !== undefined) {
      conditions.push(eq(receivers.type, args.filter.type))
    }

    conditions.push(eq(receivers.status, args.filter.status))

    return and(...conditions)
  }
}
