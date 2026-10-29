/**
 * The normalization behind the `search_name` columns.
 *
 * SQLite's `LIKE` and `lower()` fold **ASCII only**: a pt-BR search for
 * "Água" would not match a stored "água" — `lower()` leaves the Á alone and
 * `LIKE` sees two different bytes. Postgres ICU folding did both.
 *
 * The fix lives on the write path: every searchable name is stored a second
 * time in a `search_name` column, lowercased and accent-stripped here, in
 * TypeScript, where Unicode folding is complete. Searches match against
 * that column (`LIKE` on lowercase-to-lowercase needs no case folding), and
 * the `(tenant_id, search_name)` unique indexes carry the per-tenant
 * uniqueness the old `lower(name)` indexes enforced.
 */

/**
 * Lowercases and accent-strips a value: NFD-decomposes, drops the combining
 * marks (á → a, ç → c), and lowercases what is left. The result is the only
 * thing `LIKE` patterns are ever compared against.
 */
export function normalizeSearchName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
