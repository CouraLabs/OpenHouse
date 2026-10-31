export const currencies = ["USD", "BRL", "EUR"] as const

export type Currency = (typeof currencies)[number]
