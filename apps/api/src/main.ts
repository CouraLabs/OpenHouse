import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module.js'
import {
  getCorsOrigins,
  getInt,
  getPositiveInt,
  isProduction,
} from './config/env.js'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Behind a reverse proxy the client's address arrives in
  // `X-Forwarded-For`; trusting exactly the configured hops lets the rate
  // limiter count per client without letting a client spoof the header.
  const proxyHops = getInt('APP_TRUST_PROXY_HOPS')
  if (proxyHops !== undefined) {
    app.set('trust proxy', proxyHops)
  }

  // Added before the routes are mounted, so every response carries the
  // security headers.
  app.use(helmet())

  // Parses the `Cookie` header into `req.cookies`, which the session guard
  // and the auth routes read.
  app.use(cookieParser())

  if (isProduction()) {
    // Only a deployed API serves a browser client, and only the origins it is
    // told about. Development is served by the Vite dev server, which proxies
    // to the API, so no browser request is cross-origin there.
    app.enableCors({ origin: getCorsOrigins() })
  }

  // Lets Nest close what it owns — including the database pool — when it
  // receives SIGTERM, which is what `docker stop` sends.
  app.enableShutdownHooks()

  await app.listen(getPositiveInt('PORT', 3000))
}
await bootstrap()
