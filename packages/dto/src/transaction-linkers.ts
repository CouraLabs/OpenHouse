import { z } from "zod"
import type {
  SearchTransactionLinkersArgs,
  TransactionLinker,
  TransactionLinkerFilter,
} from "@workspace/domain"
import { entityStatusSchema, fetchArgsSchema } from "./fetch.js"

export type {
  SearchTransactionLinkersArgs,
  TransactionLinker,
  TransactionLinkerFilter,
}

export const createTransactionLinkerSchema = z.object({
  description: z
    .string()
    .min(1, "Enter a description.")
    .max(2000, "Keep the description under 2000 characters."),
  categoryId: z
    .number({ error: "Pick a category." })
    .int()
    .positive("Pick a category."),
  receiverId: z.number().int().positive().nullish(),
})

export const updateTransactionLinkerSchema =
  createTransactionLinkerSchema.extend({
    id: z.number().int().positive(),
  })

export const transactionLinkerFilterSchema = z.object({
  description: z.string().max(2000).optional(),
  categoryId: z.number().int().positive().optional(),
  receiverId: z.number().int().positive().optional(),
  status: entityStatusSchema.default("ACTIVE"),
})

export const searchTransactionLinkersSchema = fetchArgsSchema.extend({
  filter: transactionLinkerFilterSchema.prefault({}),
})

export type CreateTransactionLinkerBody = z.infer<
  typeof createTransactionLinkerSchema
>
export type UpdateTransactionLinkerBody = z.infer<
  typeof updateTransactionLinkerSchema
>
