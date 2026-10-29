import { useMutation } from '@tanstack/react-query'
import type { CreateDataExportBody } from '@workspace/poco'

import { apiFile } from '@/lib/api.js'
import { saveFile } from '@/lib/save-file.js'

/**
 * One full-export run: the request builds the ZIP in memory and answers
 * the bytes, which are saved as a download. There is no job to poll — the
 * pending state is the request itself.
 */
export function useDataExport() {
  const run = useMutation({
    mutationFn: async (body: CreateDataExportBody) => {
      const file = await apiFile('/data-exports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }, 'openhouse-export.zip')

      saveFile(file)
    },
  })

  return { start: run, reset: run.reset }
}
