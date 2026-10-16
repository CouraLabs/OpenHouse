import { pmt, periodicRate } from '@/lib/finance.js'

/** The amortization system the financing runs on. */
export type AmortizationSystem = 'SAC' | 'PRICE'

/** The scenario the simulation runs, everything already parsed to numbers. */
export interface RentVsBuyInput {
  propertyValue: number
  downPayment: number
  /** The mortgage's total effective rate, a fraction a year. */
  annualMortgageRate: number
  /** How the property itself appreciates, a fraction a year. */
  propertyAppreciation: number
  termMonths: number
  system: AmortizationSystem
  monthlyRent: number
  /** What the invested difference earns, a fraction a year. */
  annualReturn: number
  /** How the rent itself grows, a fraction a year. */
  rentIncrease: number
}

/** One month of the schedule, every figure a positive magnitude. */
export interface RentVsBuyRow {
  month: number
  /** The outstanding balance before the month's payment. */
  balance: number
  payment: number
  amortization: number
  interest: number
  propertyValue: number
  rent: number
  /** The month's cash difference: positive, renting came out cheaper. */
  surplus: number
  /** The renter's balance: the down payment, grown, plus every surplus. */
  investment: number
}

/** The schedule plus the totals both paths end at. */
export interface RentVsBuyResult {
  rows: RentVsBuyRow[]
  amortizationTotal: number
  interestTotal: number
  paidTotal: number
  /** The property's value at the end of the term. */
  patrimony: number
  rentTotal: number
  surplusTotal: number
  investmentTotal: number
}

/** A balance this close to zero is paid off — float dust never counts. */
const PAID_OFF = 0.005

/**
 * The buy-vs-rent simulation, month by month, faithful to the Mobills
 * sheet: the buyer pays the down payment then each installment while the
 * balance lasts and the property appreciates; the renter pays the rent,
 * which grows, and invests the down payment plus whatever the installments
 * exceeded the rent by, at the investment's return.
 */
export function simulateRentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const term = Math.max(Math.round(input.termMonths), 1)
  const financing = Math.max(input.propertyValue - input.downPayment, 0)
  const monthlyMortgage = periodicRate(input.annualMortgageRate, 'month')
  const monthlyAppreciation = periodicRate(input.propertyAppreciation, 'month')
  const monthlyReturn = periodicRate(input.annualReturn, 'month')
  const monthlyRentIncrease = periodicRate(input.rentIncrease, 'month')
  // The Price installment is constant; SAC's amortization is.
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
