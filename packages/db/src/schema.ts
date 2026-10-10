import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * The database schema. Drizzle tables are plain objects, so a provider imports
 * the table it queries instead of registering it in a module.
 */
export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull().unique(),
  name: text().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
