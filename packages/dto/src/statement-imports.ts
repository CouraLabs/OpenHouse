import { z } from "zod"
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_COMMIT_MAX_BYTES,
  IMPORT_DUPLICATE_DAYS,
  IMPORT_DUPLICATE_SIMILARITY,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_UNDO_HOURS,
  importDateFormats,
  importDecimalSeparators,
  importDelimiters,
  importEncodings,
  importFileExtensions,
  importFormats,
  importSignConventions,
  MAX_INSTALLMENTS,
  type ImportBatch,
  type ImportDateFormat,
  type ImportDecimalSeparator,
  type ImportDelimiter,
  type ImportDuplicate,
  type ImportEncoding,
  type ImportFormat,
  type ImportInstallment,
  type ImportInvalidLine,
  type ImportMapping,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
  type ImportSignConvention,
  type ImportStatementWindow,
  type ImportSuggestionSource,
  type ImportUndoResult,
  type InstallmentMarker,
} from "@workspace/domain"
import { dateOnlySchema } from "./goals.js"
import { amountSchema } from "./limits.js"
import { transactionTypeSchema } from "./transactions.js"

export {
  IMPORT_CHUNK_SIZE,
  IMPORT_COMMIT_MAX_BYTES,
  IMPORT_DUPLICATE_DAYS,
  IMPORT_DUPLICATE_SIMILARITY,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_UNDO_HOURS,
  importDateFormats,
  importDecimalSeparators,
  importDelimiters,
  importEncodings,
  importFileExtensions,
  importFormats,
  importSignConventions,
  type ImportBatch,
  type ImportDateFormat,
  type ImportDecimalSeparator,
  type ImportDelimiter,
  type ImportDuplicate,
  type ImportEncoding,
  type ImportFormat,
  type ImportInstallment,
  type ImportInvalidLine,
  type ImportMapping,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
  type ImportSignConvention,
  type ImportStatementWindow,
  type ImportSuggestionSource,
  type ImportUndoResult,
  type InstallmentMarker,
}

export const importDateFormatSchema = z.enum(importDateFormats, {
  error: "Pick the date format.",
})

export const importDecimalSeparatorSchema = z.enum(importDecimalSeparators, {
  error: "Pick the decimal separator.",
})

export const importSignConventionSchema = z.enum(importSignConventions, {
  error: "Pick the sign convention.",
})

export const importEncodingSchema = z.enum(importEncodings, {
  error: "Pick the encoding.",
})

export const importDelimiterSchema = z.enum(importDelimiters, {
  error: "Pick the delimiter.",
})

const columnSchema = z
  .number({ error: "Pick a column." })
  .int("Pick a column.")
  .min(0, "Pick a column.")
  .max(255, "Pick a column.")

export const importMappingSchema = z
  .object({
    hasHeader: z.boolean(),
    dateColumn: columnSchema,
    descriptionColumn: columnSchema,
    amountColumn: columnSchema.nullish(),
    debitColumn: columnSchema.nullish(),
    creditColumn: columnSchema.nullish(),
    categoryColumn: columnSchema.nullish(),
    pendingColumn: columnSchema.nullish(),
    dateFormat: importDateFormatSchema,
    decimalSeparator: importDecimalSeparatorSchema,
    signConvention: importSignConventionSchema,
    encoding: importEncodingSchema,
    delimiter: importDelimiterSchema,
  })
  .superRefine((mapping, ctx) => {
    const single = mapping.amountColumn != null
    const split = mapping.debitColumn != null && mapping.creditColumn != null

    if (!single && !split) {
      ctx.addIssue({
        code: "custom",
        path: ["amountColumn"],
        message: "Pick the amount column, or both debit and credit.",
      })
    }
  })

export const importPreviewFieldsSchema = z.object({
  accountId: z.coerce
    .number({ error: "Pick an account." })
    .int()
    .positive("Pick an account."),
  mapping: z
    .string()
    .optional()
    .transform((text, ctx) => {
      if (text === undefined || text === "") {
        return undefined
      }

      try {
        return JSON.parse(text) as unknown
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "The mapping is not valid JSON.",
        })

        return z.NEVER
      }
    })
    .pipe(importMappingSchema.optional()),
  encoding: importEncodingSchema.optional(),
  delimiter: importDelimiterSchema.optional(),
  remap: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
})

export type ImportPreviewFields = z.infer<typeof importPreviewFieldsSchema>

export const importInstallmentSchema = z
  .object({
    count: z
      .number()
      .int()
      .min(2, "At least 2 installments.")
      .max(MAX_INSTALLMENTS, `At most ${MAX_INSTALLMENTS} installments.`),
    number: z.number().int().min(1),
  })
  .refine((installment) => installment.number <= installment.count, {
    path: ["number"],
    message: "The installment number is past the count.",
  })

export const importRowStatusSchema = z.enum(["Verify", "Checked"])

export const importCommitRowSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(255),
  note: z.string().max(2000).nullish(),
  amount: amountSchema,
  type: transactionTypeSchema,
  transactionDt: dateOnlySchema,
  categoryId: z
    .number({ error: "Pick a category." })
    .int()
    .positive("Pick a category."),
  receiverId: z.number().int().positive().nullish(),
  externalId: z.string().min(1).max(255).nullish(),
  status: importRowStatusSchema,
  installment: importInstallmentSchema.nullish(),
})

export const importCommitSchema = z.object({
  accountId: z
    .number({ error: "Pick an account." })
    .int()
    .positive("Pick an account."),
  mapping: importMappingSchema.nullish(),
  rows: z
    .array(importCommitRowSchema)
    .min(1, "Pick at least one row.")
    .max(IMPORT_MAX_ROWS, `At most ${IMPORT_MAX_ROWS} rows.`),
  confirmReconciled: z.boolean().optional(),
})

export type ImportCommitRow = z.infer<typeof importCommitRowSchema>
export type ImportCommitBody = z.infer<typeof importCommitSchema>

export const importBatchesQuerySchema = z.object({
  accountId: z.coerce.number().int().positive(),
})

export type ImportBatchesQuery = z.infer<typeof importBatchesQuerySchema>
