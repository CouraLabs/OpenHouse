import { pmt, periodicRate } from '@/lib/finance.js'

export type AmortizationSystem = 'SAC' | 'PRICE'

export interface RentVsBuyInput {
  propertyValue: number
  downPayment: number
  annualMortgageRate: number
  propertyAppreciation: number
  termMonths: number
  system: AmortizationSystem
  monthlyRent: number
  annualReturn: number
  rentIncrease: number
}

export interface RentVsBuyRow {
  month: number
  balance: number
  payment: number
  amortization: number
  interest: number
  propertyValue: number
  rent: number
  surplus: number
  investment: number
}

export interface RentVsBuyResult {
  rows: RentVsBuyRow[]
  amortizationTotal: number
  interestTotal: number
  paidTotal: number
  patrimony: number
  rentTotal: number
  surplusTotal: number
  investmentTotal: number
}

const PAID_OFF = 0.005

export function simulateRentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const term = Math.max(Math.round(input.termMonths), 1)
  const financing = Math.max(input.propertyValue - input.downPayment, 0)
  const monthlyMortgage = periodicRate(input.annualMortgageRate, 'month')
  const monthlyAppreciation = periodicRate(input.propertyAppreciation, 'month')
  const monthlyReturn = periodicRate(input.annualReturn, 'month')
  const monthlyRentIncrease = periodicRate(input.rentIncrease, 'month')
  const pricePayment =
    financing > 0 ? pmt(monthlyMortgage, term, -financing) : 0

  const rows: RentVsBuyRow[] = []
  let balance = financing
  let investment = input.downPayment
  let propertyValue = input.propertyValue
  let amortizationTotal = 0
  let interestTotal = 0
  let paidTotal = 0
  let rentTotal = 0
  let surplusTotal = 0

  rows.push({
    month: 0,
    balance,
    payment: 0,
    amortization: 0,
    interest: 0,
    propertyValue,
    rent: 0,
    surplus: 0,
    investment,
  })

  for (let month = 1; month <= term; month += 1) {
    let payment = 0
    let amortization = 0
    let interest = 0

    if (balance > PAID_OFF) {
      interest = balance * monthlyMortgage
      amortization =
        input.system === 'SAC'
          ? Math.min(financing / term, balance)
          : Math.min(Math.max(pricePayment - interest, 0), balance)
      payment = amortization + interest
      balance -= amortization

      if (balance <= PAID_OFF) {
        balance = 0
      }
    }

    const rent = input.monthlyRent * (1 + monthlyRentIncrease) ** (month - 1)
    const surplus = payment - rent
    investment = investment * (1 + monthlyReturn) + surplus
    propertyValue = input.propertyValue * (1 + monthlyAppreciation) ** month

    amortizationTotal += amortization
    interestTotal += interest
    paidTotal += payment
    rentTotal += rent
    surplusTotal += surplus

    rows.push({
      month,
      balance,
      payment,
      amortization,
      interest,
      propertyValue,
      rent,
      surplus,
      investment,
    })
  }

  return {
    rows,
    amortizationTotal: amortizationTotal + input.downPayment,
    interestTotal,
    paidTotal,
    patrimony: propertyValue,
    rentTotal,
    surplusTotal,
    investmentTotal: investment,
  }
}
