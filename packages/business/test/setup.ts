import { env } from 'cloudflare:workers'
import { applyDatabaseMigrations } from '../../db/test/apply-migrations.js'

await applyDatabaseMigrations(env.DB)
