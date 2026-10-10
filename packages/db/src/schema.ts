import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * A tenant is the isolation boundary of the application: every user belongs
 * to exactly one, and every piece of tenant data is reached through the user
 * the session was issued to.
 */
export const tenants = pgTable('tenants', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  /** The tenant's display name. Unique so sign-up can reject duplicates. */
  name: text().notNull().unique(),
  /** When the tenant's access ends, or nothing while it is active. */
  expiresIn: timestamp('expires_in', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/**
 * The roles a user can hold. The first user of a tenant is an `owner`; every
 * user after it joins with an invite code and is a `user`.
 */
export const userRoles = ['owner', 'user'] as const

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    email: text().notNull(),
    name: text().notNull(),
    /** The bcrypt hash of the password. Never the password itself. */
    password: text().notNull(),
    role: text().$type<(typeof userRoles)[number]>().notNull().default('user'),
    /**
     * The hash of the refresh token the user's current session was issued.
     * Nothing while signed out, so a presented token that verifies but does
     * not match is a reuse and revokes the session.
     */
    refreshTokenHash: text('refresh_token_hash'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Every query that resolves a session starts from the tenant, so the
    // column is indexed. Uniqueness of an email is per tenant: two tenants
    // may each have someone@example.com.
    uniqueIndex('users_tenant_id_email_key').on(table.tenantId, table.email),
    index('users_tenant_id_idx').on(table.tenantId),
  ]
)

/**
 * The code an owner generates so the next users of the tenant can sign up.
 * A code is single-use and, when set, expires at `expiresAt`.
 */
export const tenantCodes = pgTable('tenant_codes', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  code: text().notNull().unique(),
  /** When the code was used, or nothing while it is still redeemable. */
  usedAt: timestamp('used_at', { withTimezone: true }),
  /** When the code stops working, or nothing while it never does. */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type TenantCode = typeof tenantCodes.$inferSelect
export type NewTenantCode = typeof tenantCodes.$inferInsert
export type UserRole = (typeof userRoles)[number]
