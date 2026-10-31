import type { EntityStatus, FetchArgs } from "./value/fetch.js"

export type TransactionLinkerFilter = {
  description?: string | undefined
  categoryId?: number | undefined
  receiverId?: number | undefined
  status: EntityStatus
}

export type SearchTransactionLinkersArgs = FetchArgs & {
  filter: TransactionLinkerFilter
}

export type TransactionLinker = {
  id: number
  description: string
  categoryId: number
  categoryName: string
  receiverId: number | null
  receiverName: string | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}
