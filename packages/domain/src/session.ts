import type { StartPage } from "./preferences.js"
import type { TenantSettings } from "./settings.js"
import type { TierLevel } from "./tiers.js"

export const userRoles = ["owner", "user"] as const

export type UserRole = (typeof userRoles)[number]

export interface SessionUserRecord {
  id: number
  tenantId: number
  email: string
  name: string
  role: UserRole
  isActive: boolean
  anonymizedAt: Date | null
  startPage: string
  createdAt: Date
  updatedAt: Date
}

export interface SessionTenantRecord {
  id: number
  name: string
  expiresIn: Date | null
  deletionDate: string | null
  tier: number
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  user: SessionUserRecord
  tenant: SessionTenantRecord
  role: UserRole
}

export interface SessionUser {
  id: number
  tenantId: number
  email: string
  name: string
  role: UserRole
  startPage: StartPage
  createdAt: string
  updatedAt: string
}

export interface SessionTenant {
  id: number
  name: string
  tier: TierLevel
  expiresIn: string | null
  deletionDate: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionResponse {
  user: SessionUser
  tenant: SessionTenant
  settings: TenantSettings
}
