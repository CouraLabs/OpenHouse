/**
 * Who belongs to the household, asked by the features that validate a payer
 * or a split (categories, recurring rules, transactions) without depending
 * on the feature that owns the members. Abstract: `household/` provides the
 * implementation under this token and exports it.
 */
export abstract class HouseholdMembers {
  /** The ids of the tenant's active members — the ones a new expense can
   * be paid by or shared with. */
  abstract activeMemberIds(tenantId: number): Promise<number[]>

  /** The ids of every member of the tenant, removed ones included — a
   * removed member can still be settled up with. */
  abstract allMemberIds(tenantId: number): Promise<number[]>

  /** A member's display name, or nothing for a stranger to the tenant. */
  abstract nameOf(tenantId: number, userId: number): Promise<string | undefined>

  /** The tenant's owner — a member who is never removed. Expenses a removed
   * member would have paid fall to the owner. */
  abstract ownerId(tenantId: number): Promise<number | undefined>
}
