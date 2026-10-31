import type { RateUnit } from "@workspace/dto"

import { convertRate } from "./finance-math.js"

const UNITS: RateUnit[] = ["year", "month", "day"]

export interface ConvertedRate {
  unit: RateUnit
  rate: number
}

export interface CdiFigures {
  dailyDiRate: number
  dailyNetRate: number
  effectiveAnnualRate: number
  saved: number
  futureValue: number
}

export function convertToEachUnit(percent: number, from: RateUnit): ConvertedRate[] {
  return UNITS.map((unit) => ({
    unit,
    rate: convertRate(percent / 100, from, unit),
  }))
}

export function cdiExample(
  diPercent: number,
  sharePercent: number,
  deposit: number,
  years: number
): CdiFigures {
  const dailyDiRate = convertRate(diPercent / 100, "year", "day")
  const dailyNetRate = dailyDiRate * (sharePercent / 100)
  const effectiveAnnualRate = convertRate(dailyNetRate, "day", "year")
  const saved = deposit * years
  const futureValue =
    effectiveAnnualRate === 0
      ? saved
      : (deposit * ((1 + effectiveAnnualRate) ** years - 1)) /
        effectiveAnnualRate

  return {
    dailyDiRate,
    dailyNetRate,
    effectiveAnnualRate,
    saved,
    futureValue,
  }
}
