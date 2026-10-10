import { defineRelations } from 'drizzle-orm'
import * as schema from './schema.js'

/**
 * Relations for the whole schema, which drive the relational query API
 * (`db.query.*`) and not foreign keys — those come from `references()` in the
 * table definitions.
 *
 * The single-argument form includes every table with no relations. Once tables
 * reference each other, pass a callback instead:
 *
 *   defineRelations(schema, (r) => ({ users: { photos: r.many.photos() } }))
 */
export const relations = defineRelations(schema)
