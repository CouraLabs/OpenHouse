import { z } from 'zod'

export const EXPORT_SCHEMA_VERSION = 1

export const dataExportScopes = ['tenant', 'member'] as const

export type DataExportScope = (typeof dataExportScopes)[number]

export const createDataExportSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('tenant') }),
  z.object({
    scope: z.literal('member'),
    userId: z.number().int().positive(),
  }),
])

export type CreateDataExportBody = z.infer<typeof createDataExportSchema>

export type ExportManifestFile = {
  name: string
  rows: number
}

export type ExportManifest = {
  schemaVersion: number
  exportedAt: string
  scope: DataExportScope
  tenantId: number
  userId: number | null
  files: ExportManifestFile[]
}
