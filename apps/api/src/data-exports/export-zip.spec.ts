import { strFromU8, unzipSync } from 'fflate'
import type { ExportManifest } from '@workspace/poco'

import { buildExportZip } from './export-zip.js'

describe('buildExportZip', () => {
  it('writes one JSON file per entity and a manifest listing them', () => {
    const zip = buildExportZip(
      { accounts: [{ id: 1 }, { id: 2 }], goals: [] },
      {
        scope: 'tenant',
        tenantId: 7,
        userId: null,
        exportedAt: new Date('2026-10-23T12:00:00Z'),
      }
    )

    const files = unzipSync(zip)
    const manifest = JSON.parse(
      strFromU8(files['manifest.json'])
    ) as ExportManifest

    expect(Object.keys(files).sort()).toEqual([
      'accounts.json',
      'goals.json',
      'manifest.json',
    ])
    expect(manifest).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-10-23T12:00:00.000Z',
      scope: 'tenant',
      tenantId: 7,
      userId: null,
      files: [
        { name: 'accounts.json', rows: 2 },
        { name: 'goals.json', rows: 0 },
      ],
    })
    expect(JSON.parse(strFromU8(files['accounts.json']))).toEqual([
      { id: 1 },
      { id: 2 },
    ])
  })
})
