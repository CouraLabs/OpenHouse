import type { ImportFormat } from '@workspace/dto'

import { BadRequestError } from '../errors.js'

export interface UploadedImport {
  originalname: string
  bytes: Uint8Array
  size: number
}

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
