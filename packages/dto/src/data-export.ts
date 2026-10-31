import { z } from "zod"
import {
  dataExportScopes,
  EXPORT_SCHEMA_VERSION,
  type DataExportScope,
  type ExportManifest,
  type ExportManifestFile,
} from "@workspace/domain"

export {
  dataExportScopes,
  EXPORT_SCHEMA_VERSION,
  type DataExportScope,
  type ExportManifest,
  type ExportManifestFile,
}

export const createDataExportSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("tenant") }),
  z.object({
    scope: z.literal("member"),
    userId: z.number().int().positive(),
  }),
])

export type CreateDataExportBody = z.infer<typeof createDataExportSchema>
