import {
  type Business,
  createBusiness,
  type CreateBusinessOptions,
} from '@workspace/business'
import { createMiddleware } from 'hono/factory'

import { type Config, config, type Env } from '../config/env.js'
import {
  BindingMailer,
  type SendEmailBinding,
} from '../infra/binding-mailer.js'
import { SystemClock } from '../infra/system-clock.js'
import { createTurnstileSiteverify } from '../infra/turnstile-siteverify.js'
import { WebPushTransport } from '../infra/web-push-transport.js'
import type { AppEnv } from './context.js'

export function businessOptions(
  config: Config,
  env: Env
): CreateBusinessOptions {
  return {
    d1: env.DB,
    clock: new SystemClock(),
    mailer: new BindingMailer(
      env.EMAIL as SendEmailBinding | undefined,
      config.mail.from
    ),
    pushTransport: new WebPushTransport(config.push),
    siteverify: createTurnstileSiteverify(),
    config: {
      environment: config.environment,
      jwtSecret: config.jwtSecret,
      ttls: config.ttls,
      appUrl: config.mail.appUrl,
      emailVerification: config.features.emailVerification,
      turnstile: config.turnstile,
    },
  }
}

export function runtimeMiddleware(options: CreateBusinessOptions) {
  const business = createBusiness(options)

  return createMiddleware<AppEnv>(async (context, next) => {
    context.set('business', business)
    await next()
  })
}

export function businessFromEnv(env: Env): Business {
  return createBusiness(businessOptions(config(env), env))
}
