import {
  inferCategory,
  normalizeImportText,
  type ImportSuggestionSource,
} from '@workspace/poco'

export interface NamedRef {
  id: number
  name: string
}

export interface LinkerRef {
  description: string
  categoryId: number
  receiverId: number | null
}

export interface Suggestion {
  categoryId: number | null
  receiverId: number | null
  source: ImportSuggestionSource | null
}

export interface SuggestionInput {
  name: string
  categoryText: string | null
}

function containsWords(haystack: string, needle: string): boolean {
  return needle !== '' && ` ${haystack} `.includes(` ${needle} `)
}

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
