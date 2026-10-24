import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { CreateDataExportBody, DataExportJob } from '@workspace/poco'

import { api, apiFile } from '@/lib/api.js'
import { saveFile } from '@/lib/save-file.js'

/** How often a pending export is asked after, in milliseconds. */
const POLL_MS = 1000

/**
 * One full-export run: start the job, poll it until it is ready, download
 * it. The file is single-use, so a finished download clears the run. A job
 * that vanished (expired after 24 hours) reads as `expired`.
 */
export function useDataExport() {
  const [jobId, setJobId] = useState<string | null>(null)

  const start = useMutation({
    mutationFn: (body: CreateDataExportBody) =>
      api<DataExportJob>('/data-exports', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (job) => setJobId(job.id),
  })

  const job = useQuery({
    queryKey: ['data-export', jobId],
    enabled: jobId !== null,
    retry: false,
    queryFn: ({ signal }) =>
      api<DataExportJob>(`/data-exports/${jobId}`, { signal }),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? POLL_MS : false,
  })

  const reset = () => {
    setJobId(null)
    start.reset()
  }

  const download = useMutation({
    mutationFn: () =>
      apiFile(`/data-exports/${jobId}/download`, undefined, 'export.zip'),
    onSuccess: (file) => {
      saveFile(file)
      reset()
    },
  })

  return {
    start,
    job: job.data,
    expired: job.isError,
    download,
    reset,
  }
}
