import type { NavGroup, NavItem } from './nav.js'

export type NavTrailStep = { key: string; to?: string }

export function findNavTrail(
  groups: NavGroup[],
  pathname: string
): NavTrailStep[] | undefined {
  const exact = findTrail(groups, (item) => item.to === pathname)

  if (exact !== undefined) {
    return exact
  }

  return findTrail(
    groups,
    (item) => item.to !== '/' && pathname.startsWith(`${item.to}/`)
  )
}

function findTrail(
  groups: NavGroup[],
  matches: (item: NavItem) => boolean
): NavTrailStep[] | undefined {
  for (const group of groups) {
    const groupStep: NavTrailStep = { key: group.key }

    for (const entry of group.items) {
      if ('items' in entry) {
        const item = entry.items.find(matches)
        if (item) {
          return [groupStep, { key: entry.key }, { key: item.key, to: item.to }]
        }
      } else if ('children' in entry) {
        const child = entry.children.find(matches)
        if (child) {
          return [
            groupStep,
            { key: entry.key, to: entry.to },
            { key: child.key, to: child.to },
          ]
        }
        if (matches(entry)) return [groupStep, { key: entry.key, to: entry.to }]
      } else if (matches(entry)) {
        return [groupStep, { key: entry.key, to: entry.to }]
      }
    }
  }

  return undefined
}
