import { BadRequestError } from '../common/errors.js'
import type { ImportFormat } from '@workspace/poco'

/** The part of an uploaded file the import reads — the file part of the
 * multipart body, held in memory for the length of the request. */
export interface UploadedImport {
  originalname: string
  bytes: Uint8Array
  size: number
}

/** The format an upload's extension names; 400 for any other. */
export function formatOfUpload(fileName: string): ImportFormat {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase()

  if (extension === 'ofx' || extension === 'qfx') {
    return 'ofx'
  }

  if (extension === 'csv') {
    return 'csv'
  }

  throw new BadRequestError('Upload a .ofx, .qfx or .csv file.')
}
