import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module.js'
import { getCorsOrigins, getPositiveInt, isProduction } from './env.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Added before the routes are mounted, so every response carries the
  // security headers.
  app.use(helmet())

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
