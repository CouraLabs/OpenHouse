export const splitModes = ["equal", "percentage", "exact"] as const

export type SplitMode = (typeof splitModes)[number]

export type SplitEntry = {
  userId: number
  value?: string | undefined
}

export type SplitInput = {
  mode: SplitMode
  entries: SplitEntry[]
}

export type SplitShare = {
  userId: number
  share: string
}

export type SplitResolution =
  | { ok: true; shares: SplitShare[] }
  | { ok: false; message: string }
