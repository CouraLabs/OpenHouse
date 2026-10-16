import type { CategoryRef } from '@workspace/poco'

/**
 * Infers the category a transaction's description most likely lands in,
 * by fuzzy-matching the description against the tenant's category names —
 * what the transaction form runs while the user types, to preselect the
 * category instead of making them pick it every time.
 *
 * The match is scored, never binary: an exact name match wins, a name
 * contained in the other wins next, then categories whose every token the
 * description carries, then a single shared token. The comparison runs on
 * folded, stemmed words: accents are folded, punctuation is ignored, and
 * simple English plurals are stemmed away — so "Grocery store run" matches
 * "Groceries", and a token also matches when one is a prefix of the other
 * (both at least four letters), so "grocer" matches "Groceries" too. A
 * token shorter than four letters only ever matches itself, keeping "e",
 * "de", and "2" from matching everywhere.
 */

/** Folds a name into the stemmed tokens the matcher compares: lowercase,
 * without accents, split on anything that is not a letter or a digit, with
 * a trailing English plural stripped — `ies` to `y`, else a trailing `es`
 * or `s` when at least three letters survive. */
function tokens(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== '')
    .map(stem)
}

/** Strips a trailing English plural from one token: `ies` becomes `y`
 * ("groceries" → "grocery"), else a trailing `es` or `s` is dropped when
 * the remainder keeps at least three letters ("taxis" → "taxi", but "e"
 * and "de" never shrink). */
function stem(token: string): string {
  if (token.endsWith('ies')) {
    return `${token.slice(0, -3)}y`
  }

  if (token.endsWith('es') && token.length - 2 >= 3) {
    return token.slice(0, -2)
  }

  if (token.endsWith('s') && token.length - 1 >= 3) {
    return token.slice(0, -1)
  }

  return token
}

/** Answers whether two stemmed tokens are the same word — equal, or one a
 * prefix of the other with both at least four letters, so a shared stem
 * counts but short noise never does. */
function tokenMatch(a: string, b: string): boolean {
  if (a === b) {
    return true
  }

  return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))
}

/**
 * Answers the category the description fits best, or nothing when no
 * category shares anything with it. Ties go to the earlier category — the
 * list arrives ordered, so the caller decides what "first" means.
 */
export function inferCategory(
  name: string,
  categories: readonly CategoryRef[]
): CategoryRef | undefined {
  const nameTokens = tokens(name)
  const needle = nameTokens.join(' ')

  if (needle === '') {
    return undefined
  }

  let best: { score: number; category: CategoryRef | undefined } = {
    score: 0,
    category: undefined,
  }

  for (const category of categories) {
    const categoryTokens = tokens(category.name)
    const hay = categoryTokens.join(' ')
    let score = 0

    if (hay === needle) {
      score = 4
    } else if (hay !== '' && (needle.includes(hay) || hay.includes(needle))) {
      score = 3
    } else {
      // A token too short says nothing — "e", "de", "2" match everywhere.
      const longCategory = categoryTokens.filter((token) => token.length > 1)
      const matched = longCategory.filter((token) =>
        nameTokens.some((candidate) => tokenMatch(candidate, token))
      ).length

      if (longCategory.length > 0 && matched === longCategory.length) {
        score = 2
      } else if (matched > 0) {
        score = 1
      }
    }

    if (score > best.score) {
      best = { score, category }
    }
  }

  return best.category
}
