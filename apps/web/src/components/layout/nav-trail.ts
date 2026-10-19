import type { NavGroup, NavItem } from './nav.js'

/** One step of a navigation trail: an i18n key, and a route when the step is a link. */
export type NavTrailStep = { key: string; to?: string }

/**
 * The menu path to the item whose route is `pathname`: its group, subgroup or
 * collapsible parent, then the item itself. Group and subgroup steps carry no
 * route — they are labels in the menu, not pages. A detail page under an
 * item (`/bills/12`) takes the item's trail when no item links to it
 * exactly. Returns `undefined` when no menu item links to `pathname` or a
 * parent of it.
 */
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

/** The trail to the first menu item `matches` accepts. */
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
