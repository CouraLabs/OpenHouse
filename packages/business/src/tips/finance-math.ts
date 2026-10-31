import type { RateUnit } from "@workspace/dto"

import { BadRequestError } from "../errors.js"

const FACTORS: Record<RateUnit, Record<RateUnit, number>> = {
  year: { year: 1, month: 1 / 12, day: 1 / 252 },
  month: { year: 12, month: 1, day: 1 / 22 },
  day: { year: 252, month: 22, day: 1 },
}

const RESULT_TOO_LARGE = "The result is too large to show."

export function periodicRate(annual: number, unit: RateUnit): number {
  return (1 + annual) ** FACTORS.year[unit] - 1
}

export function convertRate(rate: number, from: RateUnit, to: RateUnit): number {
  return (1 + rate) ** FACTORS[from][to] - 1
}

export function realRate(nominal: number, drags: number): number {
  return (1 + nominal) / (1 + drags) - 1
}

export function pmt(rate: number, nper: number, pv: number, fv = 0): number {
  if (rate === 0) {
    return -(pv + fv) / nper
  }

  const growth = (1 + rate) ** nper

  return (-(pv * growth + fv) * rate) / (growth - 1)
}

export function toMoney(value: number): string {
  if (!Number.isFinite(value)) {
    throw new BadRequestError(RESULT_TOO_LARGE)
  }

  const normalized = Math.abs(value) < 0.005 ? 0 : value

  return normalized.toFixed(2)
}
