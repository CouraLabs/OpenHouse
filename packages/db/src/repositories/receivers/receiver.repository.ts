import { and, asc, count, eq, like } from 'drizzle-orm'
import type { SearchReceiversArgs } from '@workspace/domain'
import type { Database } from '../../database.js'
import { buildPagedQuery, likePattern } from '../../query/paged-query.js'
import { receivers, type Receiver } from '../../schema.js'
import { normalizeSearchName } from '../../search-name.js'

export interface ReceiverSearch {
  rows: Receiver[]
  total: number
}

export interface ReceiverWrite {
  name: string
  type: Receiver['type']
}

export class ReceiverRepository {
  constructor(private readonly db: Database) {}

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
        searchName: normalizeSearchName(data.name),
      })
      .returning()

    return row
  }

  async getOrCreatePerson(
    tenantId: number,
    userId: number,
    name: string
  ): Promise<Receiver> {
    const [existing] = await this.db
      .select()
      .from(receivers)
      .where(
        and(
          eq(receivers.tenantId, tenantId),
          eq(receivers.status, 'ACTIVE'),
          eq(receivers.type, 'Person'),
          eq(receivers.searchName, normalizeSearchName(name))
        )
      )
      .limit(1)

    return (
      existing ?? (await this.insert(tenantId, userId, { name, type: 'Person' }))
    )
  }

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
        .orderBy(...query.orderBy, asc(receivers.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(receivers).where(query.where),
    ])

    return { rows, total: counted.value }
  }

  async findById(tenantId: number, id: number): Promise<Receiver | undefined> {
    const [row] = await this.db
      .select()
      .from(receivers)
      .where(and(eq(receivers.tenantId, tenantId), eq(receivers.id, id)))

    return row
  }

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
        searchName: normalizeSearchName(data.name),
        type: data.type,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(receivers.tenantId, tenantId), eq(receivers.id, id)))
      .returning()

    return row
  }

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

  async listActive(tenantId: number): Promise<Receiver[]> {
    return this.db
      .select()
      .from(receivers)
      .where(
        and(eq(receivers.tenantId, tenantId), eq(receivers.status, 'ACTIVE'))
      )
      .orderBy(asc(receivers.name))
  }

  private filterToSql(tenantId: number, args: SearchReceiversArgs) {
    const conditions = [eq(receivers.tenantId, tenantId)]

    if (args.filter.name !== undefined) {
      conditions.push(
        like(receivers.searchName, likePattern(args.filter.name))
      )
    }

    if (args.filter.type !== undefined) {
      conditions.push(eq(receivers.type, args.filter.type))
    }

    conditions.push(eq(receivers.status, args.filter.status))

    return and(...conditions)
  }
}
