import { z } from "zod"
import {
  STATEMENT_CLOSED,
  statementStatuses,
  unpaidStatementStatuses,
  type CreditCardStatement,
  type ReconcileConflict,
  type SearchStatementsArgs,
  type StatementBankFiguresBody,
  type StatementFilter,
  type StatementReconcilePreview,
  type StatementStatus,
  type StatementStatusInput,
  type StatementWarning,
} from "@workspace/domain"
import { fetchArgsSchema } from "./fetch.js"
import { amountSchema } from "./limits.js"

export {
  STATEMENT_CLOSED,
  statementStatuses,
  unpaidStatementStatuses,
  type CreditCardStatement,
  type ReconcileConflict,
  type SearchStatementsArgs,
  type StatementBankFiguresBody,
  type StatementFilter,
  type StatementReconcilePreview,
  type StatementStatus,
  type StatementStatusInput,
  type StatementWarning,
}

export const statementStatusSchema = z.enum(statementStatuses, {
  error: "Pick a status.",
})

export const statementFilterSchema = z.object({
  accountId: z.number().int().positive().optional(),
  status: z.array(statementStatusSchema).optional(),
})

export const searchStatementsSchema = fetchArgsSchema.extend({
  filter: statementFilterSchema.prefault({}),
})

export const moveToStatementSchema = z.object({
  statementId: z
    .number({ error: "Pick a bill." })
    .int()
    .positive("Pick a bill."),
})

export const statementBankFiguresSchema = z.object({
  minimumDue: amountSchema.nullable(),
  bankTotal: amountSchema.nullable(),
})

export const reconcileStatementSchema = z.object({
  bankTotal: amountSchema,
})

export type MoveToStatementBody = z.infer<typeof moveToStatementSchema>
export type ReconcileStatementBody = z.infer<typeof reconcileStatementSchema>
