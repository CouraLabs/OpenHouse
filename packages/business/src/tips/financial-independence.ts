import { pmt, realRate } from "./finance-math.js"

export interface AccumulationScenario {
  target: number
  present: number
  rate: number
  inflation: number
  adminFee: number
  loadingFee: number
  incomeTax: number
  years: number
}

export interface AccumulationFigures {
  monthlyContribution: number
  totalContributed: number
  totalIncomeTax: number
}

export interface WithdrawalScenario {
  balance: number
  rate: number
  inflation: number
  adminFee: number
  incomeTax: number
  years: number
}

export interface WithdrawalFigures {
  monthlyWithdrawal: number
  firstMonthNetInterest: number
}

export function accumulate(scenario: AccumulationScenario): AccumulationFigures {
  const months = scenario.years * 12
  const monthlyRate = realRate(
    scenario.rate / 100,
    (scenario.inflation + scenario.adminFee) / 100
  )
  const loading = scenario.loadingFee / 100
  const tax = scenario.incomeTax / 100
  const pv = scenario.present * (1 - loading)
  const fv = scenario.target

  const base = months > 0 ? -pmt(monthlyRate, months, -pv, fv) : 0
  const grossContribution = base * (1 + loading)
  const gains = Math.max(fv - grossContribution * months, 0)
  const totalTax = gains * tax
  const contribution =
    months > 0 ? grossContribution + totalTax / months : 0

  return {
    monthlyContribution: contribution,
    totalContributed: contribution * months,
    totalIncomeTax: totalTax,
  }
}

export function withdraw(scenario: WithdrawalScenario): WithdrawalFigures {
  const months = scenario.years * 12
  const monthlyRate = realRate(
    scenario.rate / 100,
    (scenario.inflation + scenario.adminFee) / 100
  )
  const tax = scenario.incomeTax / 100

  const base = months > 0 ? -pmt(monthlyRate, months, scenario.balance) : 0

  return {
    monthlyWithdrawal: base * (1 - monthlyRate * tax),
    firstMonthNetInterest: scenario.balance * monthlyRate * (1 - tax),
  }
}
