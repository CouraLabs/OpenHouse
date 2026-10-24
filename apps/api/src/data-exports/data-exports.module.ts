import { Module } from '@nestjs/common'

import { getExportDir } from '../config/env.js'
import { DataExportRepository } from './data-export.repository.js'
import { DataExportService, EXPORT_DIR } from './data-export.service.js'
import { DataExportsController } from './data-exports.controller.js'

/**
 * The full tenant and member exports. The folder the ZIPs wait in comes
 * from `config/`, injected here so the service never reads the environment.
 */
@Module({
  controllers: [DataExportsController],
  providers: [
    DataExportRepository,
    DataExportService,
    { provide: EXPORT_DIR, useFactory: getExportDir },
  ],
})
export class DataExportsModule {}
