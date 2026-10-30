import { z } from 'zod'

import { csvLocaleField } from './csv-export.js'

import {
  entityStatusSchema,
  fetchArgsSchema,
  type EntityStatus,
} from './fetch.js'

export const receiverTypes = [
  'Person',
  'Service',
  'Merchant',
  'Charity',
] as const

export const receiverTypeSchema = z.enum(receiverTypes, {
  error: 'Pick a type.',
})

export type ReceiverType = (typeof receiverTypes)[number]

export const createReceiverSchema = z.object({
  name: z.string().min(1, 'Enter a name.').max(255),
  type: receiverTypeSchema,
})

export const updateReceiverSchema = createReceiverSchema.extend({
  id: z.number().int().positive(),
})

export const receiverFilterSchema = z.object({
  name: z.string().max(255).optional(),
  type: receiverTypeSchema.optional(),
  status: entityStatusSchema.default('ACTIVE'),
})

export const searchReceiversSchema = fetchArgsSchema.extend({
  filter: receiverFilterSchema.prefault({}),
})

export const exportReceiversSchema =
  searchReceiversSchema.extend(csvLocaleField)

export type CreateReceiverBody = z.infer<typeof createReceiverSchema>
export type UpdateReceiverBody = z.infer<typeof updateReceiverSchema>
export type SearchReceiversArgs = z.infer<typeof searchReceiversSchema>
export type ExportReceiversArgs = z.infer<typeof exportReceiversSchema>

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
