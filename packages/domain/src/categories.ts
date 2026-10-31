import type { EntityStatus, FetchArgs } from "./value/fetch.js"
import type { SplitInput } from "./splits.js"

export type CategoryFilter = {
  name?: string | undefined
  status: EntityStatus
}

export type SearchCategoriesArgs = FetchArgs & {
  filter: CategoryFilter
}

export type CategoryRef = {
  id: number
  name: string
  defaultSplit?: SplitInput | null
}

export type Category = {
  id: number
  name: string
  color: string
  defaultSplit: SplitInput | null
  status: EntityStatus
  createdDt: string
  updateDt: string
}

export type CategorySuggestion = {
  categoryId: number | null
}
