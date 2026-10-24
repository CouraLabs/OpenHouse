import { BadRequestException } from '@nestjs/common'
import type { ImportFormat } from '@workspace/poco'

/** The part of an uploaded file the import reads — what multer's memory
 * storage provides. */
export interface UploadedImport {
  originalname: string
  buffer: Buffer
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

  throw new BadRequestException('Upload a .ofx, .qfx or .csv file.')
}
