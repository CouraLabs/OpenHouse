import { z } from "zod"

import { amountSchema } from "./limits.js"

const SIGNED_PERCENT_PATTERN = /^-?\d{1,4}(\.\d{1,4})?$/
const NON_NEGATIVE_PERCENT_PATTERN = /^\d{1,4}(\.\d{1,4})?$/
const PERCENT_MESSAGE = "Enter a percentage like 12.5."

const signedPercentSchema = z
  .string()
  .regex(SIGNED_PERCENT_PATTERN, PERCENT_MESSAGE)

const nonNegativePercentSchema = z
  .string()
  .regex(NON_NEGATIVE_PERCENT_PATTERN, PERCENT_MESSAGE)

const wholeNumberSchema = (min: number, max: number) => {
  const message = `Enter a whole number from ${min} to ${max}.`

  return z
    .string()
    .regex(/^\d+$/, message)
    .refine((value) => Number(value) >= min && Number(value) <= max, message)
}

export const interestUnitSchema = z.enum(["year", "month"])

export const interestInputSchema = z.object({
  presentValue: amountSchema,
  rate: signedPercentSchema,
  periods: wholeNumberSchema(0, 300),
  unit: interestUnitSchema,
})

export const interestRowSchema = z.object({
  period: z.number().int(),
  simpleCapital: z.string(),
  simpleInterest: z.string(),
  compoundCapital: z.string(),
  compoundInterest: z.string(),
  variation: z.string(),
})

export const interestProjectionSchema = z.object({
  rows: z.array(interestRowSchema),
})

export const accumulationInputSchema = z.object({
  target: amountSchema,
  present: amountSchema,
  rate: signedPercentSchema,
  inflation: signedPercentSchema,
  adminFee: nonNegativePercentSchema,
  loadingFee: nonNegativePercentSchema,
  incomeTax: nonNegativePercentSchema,
  years: wholeNumberSchema(1, 100),
})

export const accumulationResultSchema = z.object({
  monthlyContribution: z.string(),
  totalContributed: z.string(),
  totalIncomeTax: z.string(),
})

export const withdrawalInputSchema = z.object({
  balance: amountSchema,
  rate: signedPercentSchema,
  inflation: signedPercentSchema,
  adminFee: nonNegativePercentSchema,
  incomeTax: nonNegativePercentSchema,
  years: wholeNumberSchema(1, 100),
})

export const withdrawalResultSchema = z.object({
  monthlyWithdrawal: z.string(),
  firstMonthNetInterest: z.string(),
})

export const amortizationSystemSchema = z.enum(["SAC", "PRICE"])

export const rentVsBuyInputSchema = z.object({
  propertyValue: amountSchema,
  downPayment: amountSchema,
  mortgageRate: nonNegativePercentSchema,
  propertyAppreciation: signedPercentSchema,
  termMonths: wholeNumberSchema(1, 600),
  system: amortizationSystemSchema,
  monthlyRent: amountSchema,
  investmentReturn: signedPercentSchema,
  rentIncrease: signedPercentSchema,
})

export const rentVsBuyRowSchema = z.object({
  month: z.number().int(),
  balance: z.string(),
  payment: z.string(),
  amortization: z.string(),
  interest: z.string(),
  propertyValue: z.string(),
  rent: z.string(),
  surplus: z.string(),
  investment: z.string(),
})

export const rentVsBuyResultSchema = z.object({
  rows: z.array(rentVsBuyRowSchema),
  amortizationTotal: z.string(),
  interestTotal: z.string(),
  paidTotal: z.string(),
  patrimony: z.string(),
  rentTotal: z.string(),
  surplusTotal: z.string(),
  investmentTotal: z.string(),
})

export const rateUnitSchema = z.enum(["year", "month", "day"])

export const rateConversionInputSchema = z.object({
  rate: signedPercentSchema,
  unit: rateUnitSchema,
})

export const rateConversionResultSchema = z.object({
  rates: z.array(
    z.object({
      unit: rateUnitSchema,
      rate: z.number(),
    })
  ),
})

export const cdiInputSchema = z.object({
  diRate: signedPercentSchema,
  share: nonNegativePercentSchema,
  deposit: amountSchema,
  years: wholeNumberSchema(0, 100),
})

export const cdiResultSchema = z.object({
  dailyDiRate: z.number(),
  dailyNetRate: z.number(),
  effectiveAnnualRate: z.number(),
  saved: z.string(),
  futureValue: z.string(),
})

export type InterestUnit = z.infer<typeof interestUnitSchema>
export type InterestInput = z.infer<typeof interestInputSchema>
export type InterestRow = z.infer<typeof interestRowSchema>
export type InterestProjection = z.infer<typeof interestProjectionSchema>
export type AccumulationInput = z.infer<typeof accumulationInputSchema>
export type AccumulationResult = z.infer<typeof accumulationResultSchema>
export type WithdrawalInput = z.infer<typeof withdrawalInputSchema>
export type WithdrawalResult = z.infer<typeof withdrawalResultSchema>
export type AmortizationSystem = z.infer<typeof amortizationSystemSchema>
export type RentVsBuyInput = z.infer<typeof rentVsBuyInputSchema>
export type RentVsBuyRow = z.infer<typeof rentVsBuyRowSchema>
export type RentVsBuyResult = z.infer<typeof rentVsBuyResultSchema>
export type RateUnit = z.infer<typeof rateUnitSchema>
export type RateConversionInput = z.infer<typeof rateConversionInputSchema>
export type RateConversionResult = z.infer<typeof rateConversionResultSchema>
export type CdiInput = z.infer<typeof cdiInputSchema>
export type CdiResult = z.infer<typeof cdiResultSchema>
