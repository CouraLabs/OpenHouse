import type { StartPage } from './preferences.js'
import type { TenantSettings } from './settings.js'

export interface SessionUser {
  id: number
  tenantId: number
  email: string
  name: string
  role: 'owner' | 'user'
  startPage: StartPage
  createdAt: string
  updatedAt: string
}

export interface SessionTenant {
  id: number
  name: string
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
