# Data export format

The owner's **Export all data** (Settings -> Data) and **Export data** on a
member (Settings -> Users) produce a ZIP, written by an in-process job to
`EXPORT_DIR` and downloaded in the app. It is deleted after the first
successful download or after 24 hours. Nothing is emailed. The layout below is
the input contract of a future import from backup.

## Layout

One JSON file per entity, each a pretty-printed array of rows, plus
`manifest.json`. Dates and instants are ISO 8601 strings; `numeric` columns
are strings (`"12.34"`); keys are the camelCase column names of
`packages/db/src/schema.ts`.

| File | Contents |
| --- | --- |
| `manifest.json` | `schemaVersion`, `exportedAt`, `scope` (`tenant` or `member`), `tenantId`, `userId`, `files[]` (`name`, `rows`) |
| `tenant.json`, `settings.json` | the tenant row and its settings (tenant export only) |
| `users.json` / `user.json` | users without `password` or `refreshTokenHash`; a member export carries the one profile as `user.json` |
| `accounts`, `categories`, `receivers`, `limits`, `goals`, `recurring-transactions`, `transaction-linkers`, `credit-card-statements`, `transactions`, `transaction-history`, `import-mappings` | the tenant's rows, soft-deleted ones included |
| `audit-log.json` | the tenant's audit lines (tenant export only) |

A **member export** has the same files, limited to rows whose `createdBy` is
that member.

Never included: password hashes, refresh-token hashes, invite codes, password
reset codes.

## Versioning

`manifest.schemaVersion` is `EXPORT_SCHEMA_VERSION` in `packages/poco`
(`data-export.ts`). Bump it when a file is renamed or a field changes
meaning. Import order must follow foreign keys: tenant, settings, users,
categories, receivers, accounts, statements, linkers, goals, limits,
recurring rules, transactions, history.

## CSV exports

`POST <entity>/export` takes the entity's search body plus `locale`
(`en-US` or `pt-BR`) and streams every matching row, unpaged. pt-BR writes
`;` separators, a decimal comma and `DD/MM/YYYY`; en-US writes `,`, `.` and
ISO dates. The file starts with a UTF-8 BOM. Text cells starting with `=`,
`+`, `-`, `@`, tab or CR are prefixed with `'` (CSV injection). Every export
is recorded in `audit_log`.

## Tenant deletion

The owner types the tenant name (`POST tenant-deletion`); the data is
hard-deleted 30 days later, by an hourly job that compares each tenant's own
calendar day, in one transaction, children first (history, transactions,
import mappings, recurring rules, linkers, goals, limits, statements,
accounts, receivers, categories, codes, settings, users, tenant).
`DELETE tenant-deletion` cancels. The `audit_log` line survives.
