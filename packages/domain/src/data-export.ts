export const EXPORT_SCHEMA_VERSION = 1

export const dataExportScopes = ["tenant", "member"] as const

export type DataExportScope = (typeof dataExportScopes)[number]

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
