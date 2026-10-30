import { strToU8, zipSync } from 'fflate'
import {
  EXPORT_SCHEMA_VERSION,
  type DataExportScope,
  type ExportManifest,
} from '@workspace/poco'

export interface ExportContext {
  scope: DataExportScope
  tenantId: number
  userId: number | null
  exportedAt: Date
}

export function buildExportZip(
  files: Readonly<Record<string, readonly unknown[]>>,
  context: ExportContext
): Uint8Array {
  const manifest: ExportManifest = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: context.exportedAt.toISOString(),
    scope: context.scope,
    tenantId: context.tenantId,
    userId: context.userId,
    files: Object.entries(files).map(([name, rows]) => ({
      name: `${name}.json`,
      rows: rows.length,
    })),
  }

  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
  }
  for (const [name, rows] of Object.entries(files)) {
    entries[`${name}.json`] = strToU8(JSON.stringify(rows, null, 2))
  }

  return zipSync(entries)
}
