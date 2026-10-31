import { SYSTEM_CATEGORY_NAMES } from '@workspace/dto'

export function withoutSystemCategories<
  Query extends { data: { name: string }[] | undefined },
>(query: Query): Query {
  return {
    ...query,
    data: query.data?.filter(
      (category) => !SYSTEM_CATEGORY_NAMES.includes(category.name)
    ),
  }
}
