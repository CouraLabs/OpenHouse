# Operations

The deployment is one Worker (the API under `/api`, the web app's static
assets everywhere else) with one D1 database and one queue. This runbook
covers the operations a self-hosted deployment eventually needs: backups,
the size ceiling, and observability.

## Backups (D1 Time Travel)

D1's **Time Travel** keeps point-in-time snapshots of the whole database —
30 days on Workers Paid, 7 on Free. It is per **database**, not per tenant:
restoring one household means restoring to a point in time and copying that
tenant's rows back.

### Restore everything (the common case)

```sh
# Point-in-time restore of the whole database (a timestamp or a commit
# bookmark); the database is taken out of service for the restore.
npx wrangler d1 time-travel restore openhouse --remote --timestamp="2026-10-29T12:00:00Z"
```

### Restore one household

1. Export a snapshot of the restored state: create a **fork** of the
   database at the point in time (restore into a scratch database —
   `wrangler d1 time-travel restore` works on the database itself, so fork
   by creating a second database `openhouse-restore` and, with the D1 HTTP
   API's point-in-time restore, or by restoring the main database briefly
   and exporting the tenant with `POST /api/data-exports`).
2. The export ZIP carries every row the tenant owns, children first — the
   same order a re-import follows.
3. Re-insert the tenant's rows from the ZIP's JSON files in the manifest's
   order (tenant, settings, users, categories, receivers, accounts,
   statements, linkers, goals, limits, recurring rules, transactions,
   history, import mappings). The insert order respects the foreign keys.

A tenant restore is a rare, manual procedure — the export ZIP is the
exchange format, which is why exports are audited and never stored server-side.

## The size ceiling

One D1 database holds every tenant — **10 GB is the hard ceiling** (Workers
Paid; 500 MB on Free), and it cannot be raised. Watch two signals:

- **Bytes:** `npx wrangler d1 info openhouse --remote` answers the file
  size. Check it monthly, or whenever a household's books grow
  abnormally fast.
- **Rows:** the daily balances cron (03:15 UTC) logs every table's row
  count (`[size-watch] rows total=…` in the Workers Logs) — the growth
  signal between byte checks. The alert threshold: investigate at **70% of
  the byte ceiling** (7 GB), and sooner if the row-total growth rate
  projects crossing it within a quarter.

When the ceiling nears, the path is a second D1 database per tenant group —
the repositories already take the tenant id explicitly and the database
handle rides the request, so a per-tenant router (choosing the binding by
tenant) is a contained change. See "Keeping a database per tenant possible
later" in the migration plan.

## Observability

- **Workers Logs** (enable in the Cloudflare dashboard, or
  `observability: { enabled: true }` in `wrangler.jsonc`) captures the
  Worker's `console` output: the per-request line (`method`, `route`,
  `status`, `durationMs`, `tenantId`) and the jobs' errors.
- **D1 metrics** (dashboard) answer queries/s, latency, and rows read/written.
- A slow tenant shows up as high `durationMs` on its requests; a slow query
  with `wrangler d1 insights` (or the dashboard's query metrics).

## Cron schedules

| Cron (UTC) | Job | What it does |
| --- | --- | --- |
| `15 * * * *` | tenant deletion | enqueues a job per scheduled tenant; the tenant's own calendar day decides |
| `30 * * * *` | recurring rules | enqueues a job per tenant with ACTIVE rules |
| `45 * * * *` | reminders | enqueues a job per tenant; the tenant's zone decides the send window |
| `15 3 * * *` | balances + size watch | enqueues the drift check per tenant; logs the row counts |

Every job is idempotent (Queues deliver at least once); a failed message
retries up to `max_retries` (3) and is then dropped — the next hour's cron
re-arms the work.
