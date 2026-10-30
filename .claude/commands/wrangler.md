You are configuring a Cloudflare Worker's `wrangler.jsonc` file for production use on the Workers Paid plan. This account runs MULTIPLE Worker apps that share the same monthly allotment, so limits must be conservative but realistic. Always output `wrangler.jsonc` (not `wrangler.toml`).

## Workers Paid plan base allotments (shared across ALL apps)
- Requests: 10 million / month (included)
- CPU time: 30 million CPU-ms / month (included)
- CPU time per invocation: default 30,000 ms, max 300,000 ms
- Subrequests per invocation: default 10,000, max 10,000,000

## Recommended limits by app type
Inspect the Worker's source code to determine what it does, then pick the appropriate row:

| App type                         | cpu_ms | subrequests | Notes                                    |
|----------------------------------|--------|-------------|------------------------------------------|
| Proxy / redirect / transform     | 1000   | 10          | Minimal compute, 1-2 fetch calls         |
| API endpoint (CRUD, DB read)      | 3000   | 20          | D1/KV/R2 queries, a few fetch calls      |
| SSR / fullstack (React, Astro)    | 5000   | 50          | Rendering + DB + API calls               |
| Heavy processing (AI, transforms)  | 10000  | 100         | Workers AI, image transforms, batching   |

Default if unsure: cpu_ms = 3000, subrequests = 20

## Full configuration template

Generate a complete `wrangler.jsonc` using this template. Include ONLY the fields relevant to the app — omit sections the app doesn't use.

```jsonc
{
  // ─── Required ─────────────────────────────────────────────
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "<worker-name>",
  "main": "src/index.ts",
  "upload_source_maps": true,

  // ─── Runtime ─────────────────────────────────────────────
  // Set compatibility_date to today's date
  "compatibility_date": "2026-10-30",
  // nodejs_compat enables Node.js built-in modules (fs, path, buffer, etc.)
  "compatibility_flags": ["nodejs_compat"],

  // ─── Resource limits (conservative for multi-app accounts) ──
  "limits": {
    "cpu_ms": <chosen_cpu_ms>,
    "subrequests": <chosen_subrequests>
  },

  // ─── Observability (always enable for production) ─────────
  "observability": {
    "enabled": true,
    "logs": {
      // 1 = 100% of requests logged. Lower for high-traffic Workers to control cost.
      "head_sampling_rate": 1
    },
    "traces": {
      "enabled": true,
      // Sample 1% of traces — enough for debugging without high volume
      "head_sampling_rate": 0.01
    },
    // Detect and group production failures automatically (Wrangler 4.134.0+)
    "issues": {
      "enabled": true
    }
  },

  // ─── Smart Placement (enable if Worker calls backends in specific regions) ──
  // Automatically places the Worker near its backend services to reduce latency.
  // Only affects fetch handlers. Skip for Workers with no backend dependencies.
  "placement": {
    "mode": "smart"
  },

  // ─── Static assets (if serving a frontend) ────────────────
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  },

  // ─── Environment variables (non-secret) ──────────────────
  "vars": {
    "API_HOST": "https://example.com"
  },

  // ─── Bindings (only include ones the code actually uses) ──

  // KV namespace (auto-provisioned if no id given, Wrangler 4.45.0+)
  "kv_namespaces": [
    { "binding": "MY_KV" }
  ],

  // R2 bucket (auto-provisioned if no bucket_name given)
  "r2_buckets": [
    { "binding": "MY_BUCKET", "bucket_name": "my-bucket" }
  ],

  // D1 database (auto-provisioned if no database_id given)
  "d1_databases": [
    { "binding": "DB", "database_name": "my-db" }
  ],

  // Workers AI
  "ai": {
    "binding": "AI"
  },

  // Hyperdrive (for connecting to external Postgres/MySQL)
  "hyperdrive": [
    { "binding": "HYPERDRIVE", "id": "<hyperdrive-id>" }
  ],

  // Queues (producers + consumers)
  "queues": {
    "producers": [
      { "queue": "my-queue", "binding": "MY_QUEUE" }
    ],
    "consumers": [
      {
        "queue": "my-queue",
        "max_batch_size": 100,
        "max_batch_timeout": 5,
        "max_retries": 3,
        "dead_letter_queue": "my-queue-dlq"
      }
    ]
  },

  // Durable Objects
  "durable_objects": {
    "bindings": [
      { "name": "MY_DO", "class_name": "MyDurableObject" }
    ]
  },

  // ─── Triggers ────────────────────────────────────────────
  // Cron schedules (for scheduled Workers)
  "triggers": {
    "crons": ["0 */6 * * *"]  // every 6 hours
  },

  // ─── Top-level only keys ─────────────────────────────────
  // Keep environment variables from previous deploys (prevents accidental removal)
  "keep_vars": true
}
```

## Task
1. Read the existing `wrangler.jsonc` (or `wrangler.toml` — convert to `.jsonc` if found).
2. Inspect the Worker's source code to determine what the app does and which bindings it uses.
3. Add or update ALL relevant fields from the template above based on the app's actual needs.
4. Choose appropriate `limits` values from the app-type table based on code inspection.
5. Always include: `$schema`, `name`, `main`, `upload_source_maps`, `compatibility_date` (today), `compatibility_flags` (include `nodejs_compat` unless the code doesn't need Node.js APIs), `observability` (enabled with logs + traces + issues), and `limits`.
6. Include `placement: { mode: "smart" }` if the Worker makes fetch calls to backend services.
7. Include `keep_vars: true` to prevent accidental environment variable removal.
8. Only add bindings the code actually references (check `env.*` usage in source). Do NOT add unused bindings.
9. Do NOT remove or modify any existing keys that aren't part of this update.
10. Preserve JSONC format (comments `//` and trailing commas are allowed).
11. Validate the file is valid JSONC after editing.
12. Summarize every change made, explaining which app-type row was chosen and why each binding was added or skipped.

## Rules
- If `limits` already exists with LOWER values, do NOT raise them.
- Never set `cpu_ms` above 300000 or `subrequests` above 10000000.
- Never include dependencies (npm packages) in the wrangler.jsonc.
- Never hardcode secrets in `vars` — use `wrangler secret put` or `.dev.vars` for secrets.
- If the file is `wrangler.toml`, convert it to `wrangler.jsonc` format.
- Use the `$schema` field for IDE autocomplete: `"node_modules/wrangler/config-schema.json"`.

## Budget math for multiple apps
With N apps sharing the base allotment, a rough per-app monthly budget is:
- Requests: 10,000,000 / N per month
- CPU time: 30,000,000 / N CPU-ms per month

The per-invocation `limits` are a safety net per request, NOT a monthly cap.
Monitor actual usage in the Cloudflare dashboard under Workers & Pages and adjust
limits down if any app is consuming a disproportionate share of the shared allotment.
