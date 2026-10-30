import type {
  CreateTransactionLinkerBody,
  SearchTransactionLinkersArgs,
  UpdateTransactionLinkerBody,
} from '@workspace/poco'

import { NotFoundError } from '../common/errors.js'

import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  TransactionLinkerRepository,
  type TransactionLinkerRow,
  type TransactionLinkerSearch,
} from './transaction-linker.repository.js'

export class TransactionLinkerService {
  constructor(
    private readonly repository: TransactionLinkerRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository
  ) {}

  async create(
    tenantId: number,
    userId: number,
    body: CreateTransactionLinkerBody
  ): Promise<TransactionLinkerRow> {
    await this.assertReferencesUsable(
      tenantId,
      body.categoryId,
      body.receiverId
    )

    return this.repository.insert(tenantId, userId, {
      description: body.description,
      categoryId: body.categoryId,
      receiverId: body.receiverId ?? null,
    })
  }

  async search(
    tenantId: number,
    args: SearchTransactionLinkersArgs
  ): Promise<TransactionLinkerSearch> {
    return this.repository.search(tenantId, args)
  }

  async find(tenantId: number, id: number): Promise<TransactionLinkerRow> {
    const row = await this.repository.findById(tenantId, id)

    if (row === undefined) {
      throw new NotFoundError(`No transaction linker with id ${id}.`)
    }

    return row
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateTransactionLinkerBody
  ): Promise<TransactionLinkerRow> {
    const row = await this.find(tenantId, body.id)

    if (row.status === 'DELETED') {
      throw new NotFoundError(`No transaction linker with id ${body.id}.`)
    }

    await this.assertReferencesUsable(
      tenantId,
      body.categoryId,
      body.receiverId
    )

    const updated = await this.repository.update(tenantId, body.id, userId, {
      description: body.description,
      categoryId: body.categoryId,
      receiverId: body.receiverId ?? null,
    })

    if (updated === undefined) {
      throw new NotFoundError(`No transaction linker with id ${body.id}.`)
    }

    return updated
  }

  async softDelete(
    tenantId: number,
    userId: number,
    id: number
  ): Promise<void> {
    await this.find(tenantId, id)
    await this.repository.softDelete(tenantId, id, userId)
  }

  private async assertReferencesUsable(
    tenantId: number,
    categoryId: number,
    receiverId: number | null | undefined
  ): Promise<void> {
    const category = await this.categories.findById(tenantId, categoryId)

    if (category === undefined || category.status === 'DELETED') {
      throw new NotFoundError(`No category with id ${categoryId}.`)
    }

    if (receiverId != null) {
      const receiver = await this.receivers.findById(tenantId, receiverId)

      if (receiver === undefined || receiver.status === 'DELETED') {
        throw new NotFoundError(`No receiver with id ${receiverId}.`)
      }
    }
  }
}
