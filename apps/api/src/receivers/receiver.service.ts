import { Injectable, NotFoundException } from '@nestjs/common'
import type { Receiver } from '@workspace/db'
import type {
  CreateReceiverBody,
  ReceiverRef,
  SearchReceiversArgs,
  UpdateReceiverBody,
} from '@workspace/poco'

import {
  ReceiverRepository,
  type ReceiverSearch,
} from './receiver.repository.js'

/**
 * The rules of receivers: a deleted receiver is a status change, and the
 * audit trail records the user the session acted as. The tenant and the
 * user always arrive from the caller — this service never reads a request.
 */
@Injectable()
export class ReceiverService {
  constructor(private readonly repository: ReceiverRepository) {}

  /** Creates a receiver for the tenant. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateReceiverBody
  ): Promise<Receiver> {
    return this.repository.insert(tenantId, userId, body)
  }

  /** Lists the tenant's ACTIVE receivers by name, for pickers. */
  async listActive(tenantId: number): Promise<ReceiverRef[]> {
    const rows = await this.repository.listActive(tenantId)

    return rows.map((row) => ({ id: row.id, name: row.name, type: row.type }))
  }

  /** Runs the tenant's paged search. */
  async search(
    tenantId: number,
    args: SearchReceiversArgs
  ): Promise<ReceiverSearch> {
    return this.repository.search(tenantId, args)
  }

  /** Reads one receiver — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<Receiver> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No receiver with id ${id}.`)
    }

    return row
  }

  /** Updates a receiver. A deleted receiver updates like a missing one: it
   * is gone for the UI. */
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
      throw new NotFoundException(`No receiver with id ${body.id}.`)
    }

    return updated
  }

  /** Soft-deletes a receiver. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.assertPresent(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  /** Rejects a receiver that is missing — deleted or not. */
  private async assertPresent(tenantId: number, id: number): Promise<void> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No receiver with id ${id}.`)
    }
  }
}
