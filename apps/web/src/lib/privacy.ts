import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'kantim.hide-amounts'

let hidden = readStored()
const listeners = new Set<() => void>()

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function amountsHidden(): boolean {
  return hidden
}

export function setAmountsHidden(next: boolean): void {
  hidden = next

  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    hidden = next
  }

  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function useAmountsHidden(): boolean {
  return useSyncExternalStore(subscribe, amountsHidden, () => false)
}
