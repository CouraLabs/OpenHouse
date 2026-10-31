import type { EntityStatus, FetchArgs } from "./value/fetch.js"

export const receiverTypes = [
  "Person",
  "Service",
  "Merchant",
  "Charity",
] as const

export type ReceiverType = (typeof receiverTypes)[number]

export type ReceiverFilter = {
  name?: string | undefined
  type?: ReceiverType | undefined
  status: EntityStatus
}

export type SearchReceiversArgs = FetchArgs & {
  filter: ReceiverFilter
}

export type ReceiverRef = {
  id: number
  name: string
  type: ReceiverType
}

export type Receiver = {
  id: number
  name: string
  type: ReceiverType
  status: EntityStatus
  createdDt: string
  updateDt: string
}
