# Data export format

The owner's **Export all data** (Settings -> Data) and **Export data** on a
member (Settings -> Users) produce a ZIP **in one request**: the Worker reads
the tenant's tables, builds the CSVs and the ZIP in memory, records the audit
line, and answers the bytes as a download. Nothing is stored — there is no
`EXPORT_DIR`, no job to poll, no expiry, and no one-download bookkeeping.
Nothing is emailed. The layout below is the input contract of a future
import from backup.

Cost note: the whole ZIP lives in the Worker's memory once (128 MB per
isolate), which bounds the largest tenant an export can serve; the plan's
size alert (`docs/operations.md`) watches that ceiling.

## Layout

One JSON file per entity, each a pretty-printed array of rows, plus
`manifest.json`. Dates and instants are ISO 8601 strings; money columns are
decimal strings (`"12.34"` — storage holds integer cents and the export
formats them back); keys are the camelCase column names of
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

`manifest.schemaVersion` is `EXPORT_SCHEMA_VERSION` in `packages/dto`
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

The owner types the tenant name; the data is hard-deleted 30 days later, by
the hourly cron that enqueues a job per scheduled tenant and compares each
tenant's own calendar day, in one `db.batch`, children first (history,
transactions, import mappings, recurring rules, linkers, goals, limits,
statements, accounts, receivers, categories, codes, settings, users,
tenant) — the `tenants` row last, so a crashed run resumes on the next hour.
The `audit_log` line rides the same batch and survives the delete.
