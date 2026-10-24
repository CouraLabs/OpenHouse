import {
  inferCategory,
  normalizeImportText,
  type ImportSuggestionSource,
} from '@workspace/poco'

/** A name the matcher can pick: a category or a receiver. */
export interface NamedRef {
  id: number
  name: string
}

/** A linker: a description fragment that fixes a category (and a receiver). */
export interface LinkerRef {
  description: string
  categoryId: number
  receiverId: number | null
}

/** What the tenant's data suggests for one row. */
export interface Suggestion {
  categoryId: number | null
  receiverId: number | null
  source: ImportSuggestionSource | null
}

/** The part of a row the suggester reads. */
export interface SuggestionInput {
  name: string
  /** A category name the file itself carries (a CSV category column). */
  categoryText: string | null
}

/** Whether `needle` occurs in `haystack` as whole words (both normalized). */
function containsWords(haystack: string, needle: string): boolean {
  return needle !== '' && ` ${haystack} `.includes(` ${needle} `)
}

/**
 * Builds the function that suggests a category and a receiver for an
 * imported row from the tenant's own data, in order of trust:
 *
 * 1. the category the file itself names (a CSV category column), by name;
 * 2. a transaction linker whose description the row's description contains —
 *    the longest wins — which fixes the category and, when set, the receiver;
 * 3. `inferCategory`, the fuzzy name match the transaction form runs.
 *
 * The receiver is the linker's, else the receiver whose name the description
 * contains (the longest). Matching folds case, accents, digits, and
 * punctuation, so `PADARIA   do JOÃO 123` finds the receiver "Padaria do João".
 * A linker that points at a category or receiver no longer in the lists
 * given is ignored.
 */
export function buildSuggester(data: {
  categories: readonly NamedRef[]
  receivers: readonly NamedRef[]
  linkers: readonly LinkerRef[]
}): (input: SuggestionInput) => Suggestion {
  const categoryIds = new Set(data.categories.map((category) => category.id))
  const receiverIds = new Set(data.receivers.map((receiver) => receiver.id))
  const categoryByName = new Map(
    data.categories.map((category) => [
      normalizeImportText(category.name),
      category.id,
    ])
  )
  const linkers = data.linkers
    .filter((linker) => categoryIds.has(linker.categoryId))
    .map((linker) => ({
      ...linker,
      needle: normalizeImportText(linker.description),
    }))
    .filter((linker) => linker.needle !== '')
    .sort((a, b) => b.needle.length - a.needle.length)
  const receivers = data.receivers
    .map((receiver) => ({
      id: receiver.id,
      needle: normalizeImportText(receiver.name),
    }))
    .filter((receiver) => receiver.needle !== '')
    .sort((a, b) => b.needle.length - a.needle.length)

  return ({ name, categoryText }) => {
    const folded = normalizeImportText(name)
    const linker = linkers.find((candidate) =>
      containsWords(folded, candidate.needle)
    )
    const linkerReceiver =
      linker?.receiverId != null && receiverIds.has(linker.receiverId)
        ? linker.receiverId
        : null
    const matchedReceiver =
      linkerReceiver ??
      receivers.find((receiver) => containsWords(folded, receiver.needle))
        ?.id ??
      null
    const fromFile =
      categoryText === null
        ? undefined
        : categoryByName.get(normalizeImportText(categoryText))

    if (fromFile !== undefined) {
      return {
        categoryId: fromFile,
        receiverId: matchedReceiver,
        source: 'file',
      }
    }

    if (linker !== undefined) {
      return {
        categoryId: linker.categoryId,
        receiverId: matchedReceiver,
        source: 'linker',
      }
    }

    const inferred = inferCategory(name, data.categories)

    return {
      categoryId: inferred?.id ?? null,
      receiverId: matchedReceiver,
      source: inferred === undefined ? null : 'inferred',
    }
  }
}
