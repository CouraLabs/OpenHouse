import { strToU8, zipSync } from 'fflate'
import {
  EXPORT_SCHEMA_VERSION,
  type DataExportScope,
  type ExportManifest,
} from '@workspace/poco'

/** What the manifest says about the export, besides its files. */
export interface ExportContext {
  scope: DataExportScope
  tenantId: number
  userId: number | null
  exportedAt: Date
}

/**
 * Packs the entity files into the export ZIP: one pretty-printed JSON array
 * per entity, and a `manifest.json` stating the schema version, the instant
 * of the export, and every file with its row count. Pure — the repository
 * reads, this only lays out.
 */
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
