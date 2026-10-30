export abstract class HouseholdMembers {
  abstract activeMemberIds(tenantId: number): Promise<number[]>

  abstract allMemberIds(tenantId: number): Promise<number[]>

  abstract nameOf(tenantId: number, userId: number): Promise<string | undefined>

  abstract ownerId(tenantId: number): Promise<number | undefined>
}
