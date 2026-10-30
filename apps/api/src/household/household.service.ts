import {
  isZeroMoney,
  memberBalances,
  simplifyDebts,
  type HouseholdBalance,
  type HouseholdMember,
  type HouseholdOverview,
  type HouseholdOverviewArgs,
  type MemberBalanceCheck,
} from '@workspace/poco'

import { SettingsRepository } from '../settings/settings.repository.js'
import { NotFoundError } from '../common/errors.js'
import { totalSpending } from './household-spending.js'
import { HouseholdRepository } from './household.repository.js'

export class HouseholdService {
  constructor(
    private readonly repository: HouseholdRepository,
    private readonly settings: SettingsRepository
  ) {}

  listMembers(tenantId: number): Promise<HouseholdMember[]> {
    return this.repository.listMembers(tenantId)
  }

  async overview(
    tenantId: number,
    args: HouseholdOverviewArgs
  ): Promise<HouseholdOverview> {
    const [members, settings, entries, spendingRows, settlementRows] =
      await Promise.all([
        this.repository.listMembers(tenantId),
        this.settings.findByTenant(tenantId),
        this.repository.balanceEntries(tenantId),
        this.repository.spendingRows(tenantId, args),
        this.repository.settlements(tenantId),
      ])
    const names = new Map(members.map((member) => [member.id, member]))
    const nameOf = (userId: number) => names.get(userId)?.name ?? ''
    const balances = memberBalances(entries)
    const spending = totalSpending(spendingRows)

    return {
      members,
      unsplitMode: settings?.unsplitMode ?? 'personal',
      balances: balances
        .filter(
          (item) =>
            !isZeroMoney(item.balance) ||
            names.get(item.userId)?.isActive === true
        )
        .map(
          (item): HouseholdBalance => ({
            userId: item.userId,
            userName: nameOf(item.userId),
            isActive: names.get(item.userId)?.isActive ?? false,
            currency: item.currency,
            balance: item.balance,
          })
        ),
      suggestions: simplifyDebts(balances).map((transfer) => ({
        currency: transfer.currency,
        fromUserId: transfer.fromUserId,
        fromName: nameOf(transfer.fromUserId),
        toUserId: transfer.toUserId,
        toName: nameOf(transfer.toUserId),
        amount: transfer.amount,
      })),
      byMember: spending.byMember.map((item) => ({
        ...item,
        userName: nameOf(item.userId),
      })),
      byCategory: spending.byCategory,
      settlements: settlementRows.map((row) => ({
        id: row.id,
        transactionDt: row.transactionDt,
        currency: row.currency,
        amount: row.amount,
        fromUserId: row.fromUserId,
        fromName: nameOf(row.fromUserId),
        toUserId: row.toUserId,
        toName: nameOf(row.toUserId),
        note: row.note,
      })),
    }
  }

  async balanceCheck(
    tenantId: number,
    userId: number
  ): Promise<MemberBalanceCheck> {
    const members = await this.repository.listMembers(tenantId)
    const member = members.find((candidate) => candidate.id === userId)

    if (member === undefined) {
      throw new NotFoundError('Member not found.')
    }

    const balances = memberBalances(
      await this.repository.balanceEntries(tenantId)
    )

    return {
      userId,
      userName: member.name,
      lines: balances
        .filter((item) => item.userId === userId && !isZeroMoney(item.balance))
        .map((item) => ({ currency: item.currency, balance: item.balance })),
    }
  }
}
