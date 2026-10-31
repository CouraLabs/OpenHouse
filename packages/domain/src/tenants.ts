import type { UserRole } from "./session.js"

export type InviteCode = {
  id: number
  code: string
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export type TenantUser = {
  id: number
  name: string
  email: string
  role: UserRole
  isActive: boolean
  anonymizedAt: string | null
  createdAt: string
}

export const ANONYMIZED_USER_NAME = "Former member"
