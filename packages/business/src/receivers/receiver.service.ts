import type {
  Receiver,
  ReceiverRepository,
  ReceiverSearch,
} from '@workspace/db'
import type {
  CreateReceiverBody,
  ReceiverRef,
  SearchReceiversArgs,
  UpdateReceiverBody,
} from '@workspace/dto'

import { NotFoundError } from '../errors.js'

export class ReceiverService {
  constructor(private readonly repository: ReceiverRepository) {}

  async create(
    tenantId: number,
    userId: number,
    body: CreateReceiverBody
  ): Promise<Receiver> {
    return this.repository.insert(tenantId, userId, body)
  }

  async listActive(tenantId: number): Promise<ReceiverRef[]> {
    const rows = await this.repository.listActive(tenantId)

    return rows.map((row) => ({ id: row.id, name: row.name, type: row.type }))
  }

  async search(
    tenantId: number,
    args: SearchReceiversArgs
  ): Promise<ReceiverSearch> {
    return this.repository.search(tenantId, args)
  }

  async find(tenantId: number, id: number): Promise<Receiver> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No receiver with id ${id}.`)
    }

    return row
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateReceiverBody
  ): Promise<Receiver> {
    await this.assertPresent(tenantId, body.id)

    const updated = await this.repository.update(tenantId, body.id, userId, {
      name: body.name,
      type: body.type,
    })

    if (updated === undefined) {
      throw new NotFoundError(`No receiver with id ${body.id}.`)
    }

    return updated
  }

  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.assertPresent(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  private async assertPresent(tenantId: number, id: number): Promise<void> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No receiver with id ${id}.`)
    }
  }
}
