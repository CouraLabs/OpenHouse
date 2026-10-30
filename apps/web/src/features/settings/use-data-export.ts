import { useMutation } from '@tanstack/react-query'
import type { CreateDataExportBody } from '@workspace/poco'

import { apiFile } from '@/lib/api.js'
import { saveFile } from '@/lib/save-file.js'

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
