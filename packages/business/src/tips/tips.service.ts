import type {
  AccumulationInput,
  AccumulationResult,
  CdiInput,
  CdiResult,
  InterestInput,
  InterestProjection,
  RateConversionInput,
  RateConversionResult,
  RentVsBuyInput,
  RentVsBuyResult,
  WithdrawalInput,
  WithdrawalResult,
} from "@workspace/dto"

import { toMoney } from "./finance-math.js"
import { accumulate, withdraw } from "./financial-independence.js"
import { projectInterest } from "./interest.js"
import { cdiExample, convertToEachUnit } from "./rate-conversion.js"
import { simulateRentVsBuy } from "./rent-vs-buy.js"

export class TipsService {
  interest(input: InterestInput): InterestProjection {
    const rows = projectInterest(
      Number(input.presentValue),
      Number(input.rate),
      Number(input.periods),
      input.unit
    )

    return {
      rows: rows.map((row) => ({
        period: row.period,
        simpleCapital: toMoney(row.simpleCapital),
        simpleInterest: toMoney(row.simpleInterest),
        compoundCapital: toMoney(row.compoundCapital),
        compoundInterest: toMoney(row.compoundInterest),
        variation: toMoney(row.variation),
      })),
    }
  }

  accumulation(input: AccumulationInput): AccumulationResult {
    const figures = accumulate({
      target: Number(input.target),
      present: Number(input.present),
      rate: Number(input.rate),
      inflation: Number(input.inflation),
      adminFee: Number(input.adminFee),
      loadingFee: Number(input.loadingFee),
      incomeTax: Number(input.incomeTax),
      years: Number(input.years),
    })

    return {
      monthlyContribution: toMoney(figures.monthlyContribution),
      totalContributed: toMoney(figures.totalContributed),
      totalIncomeTax: toMoney(figures.totalIncomeTax),
    }
  }

  withdrawal(input: WithdrawalInput): WithdrawalResult {
    const figures = withdraw({
      balance: Number(input.balance),
      rate: Number(input.rate),
      inflation: Number(input.inflation),
      adminFee: Number(input.adminFee),
      incomeTax: Number(input.incomeTax),
      years: Number(input.years),
    })

    return {
      monthlyWithdrawal: toMoney(figures.monthlyWithdrawal),
      firstMonthNetInterest: toMoney(figures.firstMonthNetInterest),
    }
  }

  rentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
    const figures = simulateRentVsBuy({
      propertyValue: Number(input.propertyValue),
      downPayment: Number(input.downPayment),
      annualMortgageRate: Number(input.mortgageRate) / 100,
      propertyAppreciation: Number(input.propertyAppreciation) / 100,
      termMonths: Number(input.termMonths),
      system: input.system,
      monthlyRent: Number(input.monthlyRent),
      annualReturn: Number(input.investmentReturn) / 100,
      rentIncrease: Number(input.rentIncrease) / 100,
    })

    return {
      rows: figures.rows.map((row) => ({
        month: row.month,
        balance: toMoney(row.balance),
        payment: toMoney(row.payment),
        amortization: toMoney(row.amortization),
        interest: toMoney(row.interest),
        propertyValue: toMoney(row.propertyValue),
        rent: toMoney(row.rent),
        surplus: toMoney(row.surplus),
        investment: toMoney(row.investment),
      })),
      amortizationTotal: toMoney(figures.amortizationTotal),
      interestTotal: toMoney(figures.interestTotal),
      paidTotal: toMoney(figures.paidTotal),
      patrimony: toMoney(figures.patrimony),
      rentTotal: toMoney(figures.rentTotal),
      surplusTotal: toMoney(figures.surplusTotal),
      investmentTotal: toMoney(figures.investmentTotal),
    }
  }

  rateConversion(input: RateConversionInput): RateConversionResult {
    return {
      rates: convertToEachUnit(Number(input.rate), input.unit),
    }
  }

  cdi(input: CdiInput): CdiResult {
    const figures = cdiExample(
      Number(input.diRate),
      Number(input.share),
      Number(input.deposit),
      Number(input.years)
    )

    return {
      dailyDiRate: figures.dailyDiRate,
      dailyNetRate: figures.dailyNetRate,
      effectiveAnnualRate: figures.effectiveAnnualRate,
      saved: toMoney(figures.saved),
      futureValue: toMoney(figures.futureValue),
    }
  }
}
