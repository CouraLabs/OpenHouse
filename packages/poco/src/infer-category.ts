import type { CategoryRef } from './categories.js'

function tokens(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== '')
    .map(stem)
}

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

function tokenMatch(a: string, b: string): boolean {
  if (a === b) {
    return true
  }

  return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))
}

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
