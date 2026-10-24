import type { ApiFile } from './api.js'

/** Hands a downloaded file to the browser's save flow. */
export function saveFile({ blob, filename }: ApiFile): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
