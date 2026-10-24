import { Global, Module } from '@nestjs/common'

import { CsvExporter } from './csv-exporter.js'

/**
 * Provides the `CsvExporter` to every feature's export route. Global, like
 * the clock: streaming a CSV is infrastructure, not a domain dependency.
 */
@Global()
@Module({
  providers: [CsvExporter],
  exports: [CsvExporter],
})
export class CsvModule {}
