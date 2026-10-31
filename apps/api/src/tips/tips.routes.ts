import { Hono } from 'hono'
import {
  accumulationInputSchema,
  cdiInputSchema,
  interestInputSchema,
  rateConversionInputSchema,
  rentVsBuyInputSchema,
  withdrawalInputSchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function tipsRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.post('/interest', async (context) => {
    const body = await parseJsonBody(context, interestInputSchema)

    return context.json(context.var.business.tips.interest(body))
  })

  router.post('/accumulation', async (context) => {
    const body = await parseJsonBody(context, accumulationInputSchema)

    return context.json(context.var.business.tips.accumulation(body))
  })

  router.post('/withdrawal', async (context) => {
    const body = await parseJsonBody(context, withdrawalInputSchema)

    return context.json(context.var.business.tips.withdrawal(body))
  })

  router.post('/rent-vs-buy', async (context) => {
    const body = await parseJsonBody(context, rentVsBuyInputSchema)

    return context.json(context.var.business.tips.rentVsBuy(body))
  })

  router.post('/rate-conversion', async (context) => {
    const body = await parseJsonBody(context, rateConversionInputSchema)

    return context.json(context.var.business.tips.rateConversion(body))
  })

  router.post('/cdi', async (context) => {
    const body = await parseJsonBody(context, cdiInputSchema)

    return context.json(context.var.business.tips.cdi(body))
  })

  return router
}
