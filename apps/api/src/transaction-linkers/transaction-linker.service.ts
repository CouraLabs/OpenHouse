import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  CreateTransactionLinkerBody,
  SearchTransactionLinkersArgs,
  UpdateTransactionLinkerBody,
} from '@workspace/poco'

import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  TransactionLinkerRepository,
  type TransactionLinkerRow,
  type TransactionLinkerSearch,
} from './transaction-linker.repository.js'

/**
 * The rules of transaction linkers: a linker must point at a category and —
 * when set — a receiver the tenant owns and has not deleted, a deleted
 * linker is a status change, and the audit trail records the user the
 * session acted as. The tenant and the user always arrive from the caller —
 * this service never reads a request.
 */
@Injectable()
export class TransactionLinkerService {
  constructor(
    private readonly repository: TransactionLinkerRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository
  ) {}

  /** Creates a linker for the tenant, rejecting references it cannot use. */
  async create(
    tenantId: number,
    userId: number,
    body: CreateTransactionLinkerBody
  ): Promise<TransactionLinkerRow> {
    await this.assertReferencesUsable(tenantId, body.categoryId, body.receiverId)

    return this.repository.insert(tenantId, userId, {
      description: body.description,
      categoryId: body.categoryId,
      receiverId: body.receiverId ?? null,
    })
  }

  /** Runs the tenant's paged search. */
  async search(
    tenantId: number,
    args: SearchTransactionLinkersArgs
  ): Promise<TransactionLinkerSearch> {
    return this.repository.search(tenantId, args)
  }

  /** Reads one linker — deleted included; the caller decides what to show. */
  async find(tenantId: number, id: number): Promise<TransactionLinkerRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundException(`No transaction linker with id ${id}.`)
    }

    return row
  }

  /** Updates a linker, rejecting references it cannot use. A deleted linker
   * updates like a missing one: it is gone for the UI. */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateTransactionLinkerBody
  ): Promise<TransactionLinkerRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundException(`No transaction linker with id ${body.id}.`)
    }

    await this.assertReferencesUsable(tenantId, body.categoryId, body.receiverId)

    const updated = await this.repository.update(tenantId, body.id, userId, {
      description: body.description,
      categoryId: body.categoryId,
      receiverId: body.receiverId ?? null,
    })

    if (updated === undefined) {
      throw new NotFoundException(`No transaction linker with id ${body.id}.`)
    }

    return updated
  }

  /** Soft-deletes a linker. Deleting an already-deleted row is a no-op. */
  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  /** Rejects a category that is missing or no longer ACTIVE, and a receiver
   * that was set but is missing or no longer ACTIVE. */
  private async assertReferencesUsable(
    tenantId: number,
    categoryId: number,
    receiverId: number | null | undefined
  ): Promise<void> {
    const category = await this.categories.findById(tenantId, categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundException(`No category with id ${categoryId}.`)
    }

    if (receiverId != null) {
      const receiver = await this.receivers.findById(tenantId, receiverId)

      if (receiver === undefined || receiver.status === 'DELETED') {
        throw new NotFoundException(`No receiver with id ${receiverId}.`)
      }
    }
  }
}
