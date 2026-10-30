import { z } from 'zod'

export const currencies = ['USD', 'BRL', 'EUR'] as const

export const currencySchema = z.enum(currencies, { error: 'Pick a currency.' })

export type Currency = (typeof currencies)[number]
