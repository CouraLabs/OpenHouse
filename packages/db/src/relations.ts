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
    settings: r.one.tenantSettings({
      from: r.tenants.id,
      to: r.tenantSettings.tenantId,
    }),
    categories: r.many.categories(),
    limits: r.many.limits(),
    accounts: r.many.accounts(),
    creditCardStatements: r.many.creditCardStatements(),
    goals: r.many.goals(),
    receivers: r.many.receivers(),
    transactionLinkers: r.many.transactionLinkers(),
    recurringTransactions: r.many.recurringTransactions(),
    transactions: r.many.transactions(),
  },
  users: {
    tenant: r.one.tenants({
      from: r.users.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
  },
  tenantSettings: {
    tenant: r.one.tenants({
      from: r.tenantSettings.tenantId,
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
  categories: {
    tenant: r.one.tenants({
      from: r.categories.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    limits: r.many.limits(),
  },
  limits: {
    tenant: r.one.tenants({
      from: r.limits.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    category: r.one.categories({
      from: r.limits.categoryId,
      to: r.categories.id,
      optional: false,
    }),
  },
  accounts: {
    tenant: r.one.tenants({
      from: r.accounts.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    goals: r.many.goals(),
    statements: r.many.creditCardStatements(),
  },
  creditCardStatements: {
    tenant: r.one.tenants({
      from: r.creditCardStatements.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    account: r.one.accounts({
      from: r.creditCardStatements.accountId,
      to: r.accounts.id,
      optional: false,
    }),
    transactions: r.many.transactions({ alias: 'statement' }),
    payments: r.many.transactions({ alias: 'payment_statement' }),
  },
  goals: {
    tenant: r.one.tenants({
      from: r.goals.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    linkedAccount: r.one.accounts({
      from: r.goals.linkedAccountId,
      to: r.accounts.id,
      optional: false,
    }),
  },
  receivers: {
    tenant: r.one.tenants({
      from: r.receivers.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    transactionLinkers: r.many.transactionLinkers(),
    recurringTransactions: r.many.recurringTransactions(),
    transactions: r.many.transactions(),
  },
  transactionLinkers: {
    tenant: r.one.tenants({
      from: r.transactionLinkers.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    category: r.one.categories({
      from: r.transactionLinkers.categoryId,
      to: r.categories.id,
      optional: false,
    }),
    receiver: r.one.receivers({
      from: r.transactionLinkers.receiverId,
      to: r.receivers.id,
      optional: true,
    }),
  },
  recurringTransactions: {
    tenant: r.one.tenants({
      from: r.recurringTransactions.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    receiver: r.one.receivers({
      from: r.recurringTransactions.receiverId,
      to: r.receivers.id,
      optional: false,
    }),
    category: r.one.categories({
      from: r.recurringTransactions.categoryId,
      to: r.categories.id,
      optional: false,
    }),
    linkedAccount: r.one.accounts({
      from: r.recurringTransactions.linkedAccountId,
      to: r.accounts.id,
      optional: false,
    }),
    transactions: r.many.transactions(),
  },
  transactions: {
    tenant: r.one.tenants({
      from: r.transactions.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    linkedAccount: r.one.accounts({
      from: r.transactions.linkedAccountId,
      to: r.accounts.id,
      optional: false,
    }),
    category: r.one.categories({
      from: r.transactions.categoryId,
      to: r.categories.id,
      optional: false,
    }),
    receiver: r.one.receivers({
      from: r.transactions.receiverId,
      to: r.receivers.id,
      optional: true,
    }),
    recurring: r.one.recurringTransactions({
      from: r.transactions.recurringId,
      to: r.recurringTransactions.id,
      optional: true,
    }),
    statement: r.one.creditCardStatements({
      from: r.transactions.statementId,
      to: r.creditCardStatements.id,
      optional: true,
      alias: 'statement',
    }),
    paymentStatement: r.one.creditCardStatements({
      from: r.transactions.paymentStatementId,
      to: r.creditCardStatements.id,
      optional: true,
      alias: 'payment_statement',
    }),
    history: r.many.transactionHistory(),
  },
  transactionHistory: {
    tenant: r.one.tenants({
      from: r.transactionHistory.tenantId,
      to: r.tenants.id,
      optional: false,
    }),
    transaction: r.one.transactions({
      from: r.transactionHistory.transactionId,
      to: r.transactions.id,
      optional: false,
    }),
  },
}))
