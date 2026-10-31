import type { InterestUnit } from "@workspace/dto"

import { periodicRate } from "./finance-math.js"

export interface InterestPoint {
  period: number
  simpleCapital: number
  simpleInterest: number
  compoundCapital: number
  compoundInterest: number
  variation: number
}

export function projectInterest(
  presentValue: number,
  rate: number,
  periods: number,
  unit: InterestUnit
): InterestPoint[] {
  const perPeriod =
    unit === "year" ? rate / 100 : periodicRate(rate / 100, "month")
  const points: InterestPoint[] = []

  for (let period = 0; period <= periods; period += 1) {
    const simple = presentValue * (1 + perPeriod * period)
    const compound = presentValue * (1 + perPeriod) ** period

    points.push({
      period,
      simpleCapital: simple,
      simpleInterest: simple - presentValue,
      compoundCapital: compound,
      compoundInterest: compound - presentValue,
      variation: compound - simple,
    })
  }

  return points
}
