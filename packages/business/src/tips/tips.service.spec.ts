import { describe, expect, it } from "vitest"

import { BadRequestError } from "../errors.js"
import { toMoney } from "./finance-math.js"
import { TipsService } from "./tips.service.js"

const tips = new TipsService()

describe("toMoney", () => {
  it("formats cents with two decimals", () => {
    expect(toMoney(1104.7499)).toBe("1104.75")
    expect(toMoney(-421086.644)).toBe("-421086.64")
  })

  it("never prints a negative zero", () => {
    expect(toMoney(-0.001)).toBe("0.00")
    expect(toMoney(-0)).toBe("0.00")
  })

  it("refuses results that are not finite", () => {
    expect(() => toMoney(Number.POSITIVE_INFINITY)).toThrow(BadRequestError)
  })
})

describe("interest projection", () => {
  it("matches the simple vs compound baseline", () => {
    const { rows } = tips.interest({
      presentValue: "15000.00",
      rate: "10",
      periods: "15",
      unit: "year",
    })

    expect(rows).toHaveLength(16)
    expect(rows[5]).toMatchObject({
      period: 5,
      simpleCapital: "22500.00",
      compoundCapital: "24157.65",
    })
    expect(rows.at(-1)).toMatchObject({
      simpleCapital: "37500.00",
      compoundCapital: "62658.72",
      variation: "25158.72",
    })
  })

  it("returns only the starting row for zero periods", () => {
    const { rows } = tips.interest({
      presentValue: "15000.00",
      rate: "10",
      periods: "0",
      unit: "year",
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ simpleCapital: "15000.00" })
  })
})

describe("financial independence", () => {
  it("matches the accumulation baseline", () => {
    expect(
      tips.accumulation({
        target: "2000000.00",
        present: "25000.00",
        rate: "0.8",
        inflation: "0.2",
        adminFee: "0",
        loadingFee: "0",
        incomeTax: "15",
        years: "40",
      })
    ).toEqual({
      monthlyContribution: "1104.75",
      totalContributed: "530278.45",
      totalIncomeTax: "259362.63",
    })
  })

  it("matches the withdrawal baseline", () => {
    expect(
      tips.withdrawal({
        balance: "2000000.00",
        rate: "0.6",
        inflation: "0",
        adminFee: "0",
        incomeTax: "15",
        years: "20",
      })
    ).toEqual({
      monthlyWithdrawal: "15732.81",
      firstMonthNetInterest: "10200.00",
    })
  })
})

describe("buy or rent", () => {
  const baseline = {
    propertyValue: "400000.00",
    downPayment: "50000.00",
    mortgageRate: "12",
    propertyAppreciation: "4",
    termMonths: "360",
    system: "SAC" as const,
    monthlyRent: "2000.00",
    investmentReturn: "12",
    rentIncrease: "4",
  }

  it("matches the buy or rent baseline", () => {
    const result = tips.rentVsBuy(baseline)

    expect(result.rows).toHaveLength(361)
    expect(result).toMatchObject({
      amortizationTotal: "400000.00",
      interestTotal: "599454.49",
      paidTotal: "949454.49",
      patrimony: "1297359.00",
      rentTotal: "1370541.13",
      surplusTotal: "-421086.64",
      investmentTotal: "3386608.87",
    })
  })

  it("treats a term below one month as one month", () => {
    expect(
      tips.rentVsBuy({ ...baseline, termMonths: "0" }).rows
    ).toHaveLength(2)
  })
})

describe("rate conversion", () => {
  it("converts a yearly rate to months and business days by compounding", () => {
    const { rates } = tips.rateConversion({ rate: "10", unit: "year" })

    expect(rates.map((item) => item.unit)).toEqual(["year", "month", "day"])
    expect(rates[0].rate).toBeCloseTo(0.1, 10)
    expect(rates[1].rate).toBeCloseTo(0.007974, 5)
    expect(rates[2].rate).toBeCloseTo(0.000378, 6)
  })
})

describe("CDI example", () => {
  it("matches the CDI baseline rates", () => {
    const result = tips.cdi({
      diRate: "13",
      share: "90",
      deposit: "10000.00",
      years: "10",
    })

    expect(result.dailyDiRate).toBeCloseTo(0.000485, 6)
    expect(result.dailyNetRate).toBeCloseTo(0.000437, 6)
    expect(result.effectiveAnnualRate).toBeCloseTo(0.116276, 4)
    expect(result.saved).toBe("100000.00")
  })
})
