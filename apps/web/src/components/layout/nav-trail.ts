import type { NavGroup, NavItem } from './nav.js'

/** One step of a navigation trail: an i18n key, and a route when the step is a link. */
export type NavTrailStep = { key: string; to?: string }

/**
 * The menu path to the item whose route is `pathname`: its group, subgroup or
 * collapsible parent, then the item itself. Group and subgroup steps carry no
 * route — they are labels in the menu, not pages. Returns `undefined` when no
 * menu item links to `pathname`.
 */
export function findNavTrail(
  groups: NavGroup[],
  pathname: string
): NavTrailStep[] | undefined {
  const matches = (item: NavItem) => item.to === pathname

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
