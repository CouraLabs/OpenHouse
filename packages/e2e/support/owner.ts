import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const AUTH_FILE = fileURLToPath(new URL('../.auth/owner.json', import.meta.url))

const OWNER_FILE = fileURLToPath(new URL('../.auth/owner-account.json', import.meta.url))

const SIGN_IN_FILE = fileURLToPath(new URL('../.auth/sign-in-account.json', import.meta.url))

export interface OwnerAccount {
  household: string
  name: string
  email: string
  password: string
}

export function saveOwnerAccount(owner: OwnerAccount): void {
  writeAccount(OWNER_FILE, owner)
}

export function loadOwnerAccount(): OwnerAccount {
  return readAccount(OWNER_FILE)
}

export function saveSignInAccount(account: OwnerAccount): void {
  writeAccount(SIGN_IN_FILE, account)
}

export function loadSignInAccount(): OwnerAccount {
  return readAccount(SIGN_IN_FILE)
}

function writeAccount(file: string, account: OwnerAccount): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(account, null, 2))
}

function readAccount(file: string): OwnerAccount {
  return JSON.parse(readFileSync(file, 'utf8')) as OwnerAccount
}
