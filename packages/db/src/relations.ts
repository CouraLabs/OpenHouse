import { defineRelations } from 'drizzle-orm'
import * as schema from './schema.js'

/**
 * Relations for the whole schema, which drive the relational query API
 * (`db.query.*`) and not foreign keys — those come from `references()` in the
 * table definitions.
 */
export const relations = defineRelations(schema, (r) => ({
  tenants: {
    users: r.many.users(),
    tenantCodes: r.many.tenantCodes(),
  },
  users: {
    tenant: r.one.tenants({
      from: r.users.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
  },
  tenantCodes: {
    tenant: r.one.tenants({
      from: r.tenantCodes.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
  },
}))
