import { z } from 'zod'

/**
 * The full-export contract: the owner asks for a ZIP of the tenant's data
 * (or of one member's), an in-process job writes it, the Settings page
 * polls the job and offers the download. There is no email: the file is
 * delivered in the app only, and it expires after 24 hours or after the
 * first successful download.
 *
 * The ZIP is also the input format of a future import from backup; its
 * layout is documented in `docs/data-export.md`.
 */

/** The version of the ZIP layout the manifest states. Bump it when a file
 * is renamed or a field changes meaning. */
export const EXPORT_SCHEMA_VERSION = 1

/** How long a finished export waits to be downloaded, in hours. */
export const EXPORT_TTL_HOURS = 24

/** What an export covers: the whole tenant, or one member's own data. */
export const dataExportScopes = ['tenant', 'member'] as const

export type DataExportScope = (typeof dataExportScopes)[number]

/** The body `POST data-exports` accepts. */
export const createDataExportSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('tenant') }),
  z.object({
    scope: z.literal('member'),
    /** The member whose profile and created rows are exported. */
    userId: z.number().int().positive(),
  }),
])

export type CreateDataExportBody = z.infer<typeof createDataExportSchema>

/** Where a job stands: still writing, ready to download, or failed. */
export const dataExportStatuses = ['pending', 'ready', 'failed'] as const

export type DataExportStatus = (typeof dataExportStatuses)[number]

/** A full-export job, as the routes answer it. */
export type DataExportJob = {
  id: string
  scope: DataExportScope
  /** The member exported, or nothing for a tenant export. */
  userId: number | null
  status: DataExportStatus
  /** The size of the ZIP once it is ready. */
  sizeBytes: number | null
  createdAt: string
  /** When the file is deleted if nobody downloaded it. */
  expiresAt: string
}

/** One JSON file of the ZIP, as the manifest lists it. */
export type ExportManifestFile = {
  /** The file name inside the ZIP, e.g. `accounts.json`. */
  name: string
  /** How many rows (objects) the file's array holds. */
  rows: number
}

/** The `manifest.json` at the root of every export ZIP. */
export type ExportManifest = {
  schemaVersion: number
  /** The instant the export ran, ISO 8601. */
  exportedAt: string
  scope: DataExportScope
  tenantId: number
  /** The member of a member export, or nothing. */
  userId: number | null
  files: ExportManifestFile[]
}
