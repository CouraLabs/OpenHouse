import { z } from "zod"
import {
  receiverTypes,
  type Receiver,
  type ReceiverFilter,
  type ReceiverRef,
  type ReceiverType,
  type SearchReceiversArgs,
} from "@workspace/domain"
import { csvLocaleField } from "./csv-export.js"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"

export {
  receiverTypes,
  type Receiver,
  type ReceiverFilter,
  type ReceiverRef,
  type ReceiverType,
  type SearchReceiversArgs,
}

export const receiverTypeSchema = z.enum(receiverTypes, {
  error: "Pick a type.",
})

export const createReceiverSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255),
  type: receiverTypeSchema,
})

export const updateReceiverSchema = createReceiverSchema.extend({
  id: z.number().int().positive(),
})

export const receiverFilterSchema = z.object({
  name: z.string().max(255).optional(),
  type: receiverTypeSchema.optional(),
  status: entityStatusSchema.default("ACTIVE"),
})

export const searchReceiversSchema = fetchArgsSchema.extend({
  filter: receiverFilterSchema.prefault({}),
})

export const exportReceiversSchema =
  searchReceiversSchema.extend(csvLocaleField)

export type CreateReceiverBody = z.infer<typeof createReceiverSchema>
export type UpdateReceiverBody = z.infer<typeof updateReceiverSchema>
export type ExportReceiversArgs = z.infer<typeof exportReceiversSchema>
