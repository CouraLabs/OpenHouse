<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

`apps/api` is the [Nest](https://github.com/nestjs/nest) service of the `openhouse` Turborepo monorepo. It is the workspace package `api` and shares the root lockfile and the `turbo` task pipeline with `apps/web` and `packages/ui`.

## Project setup

Install from the repository root. Dependencies are hoisted into the root `node_modules` and the single `package-lock.json` covers every workspace:

```bash
$ npm install
```

## Scripts

Each script is also a `turbo` task, so the root command runs it here and in the other workspaces:

| script | command |
| --- | --- |
| `dev` | `nest start --watch` |
| `build` | `nest build` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` (unit) |
| `test:e2e` | `vitest run --config ./vitest.config.e2e.ts` |
| `lint` | `biome lint .` |
| `format` | `prettier --write "**/*.ts"` |
| `reset-code` | `node dist/reset-code.js` (needs a build; see below) |

## Password reset from the server

Password recovery needs no email. A member asks the household's owner for a
reset code (**Settings → Users → Reset password**), and an owner uses one of
the recovery codes from **Settings → Security**. An owner who lost both the
password and the recovery codes recovers with this command, which needs server
access and has no HTTP route:

```bash
# Docker deployment
docker compose exec api npm run reset-code -- --email owner@example.com

# from a checkout, after `npm run build`
npm run reset-code -- --email owner@example.com
```

It prints a one-time code, valid for 30 minutes, to enter on `/reset-password`
with a new password. The code is recorded with kind `server` in
`password_reset_codes` (only its hash), which is the audit entry. The user also
sees a notice that a code was issued from the server the next time they sign in.

## Compile and run the project

```bash
# watch mode, listening on :3000
$ npm run dev -w api

# production build
$ npm run build -w api
$ node apps/api/dist/main.js
```

`nest build` emits `dist/main.js`; run it with `node dist/main` from this directory. The runtime dependencies live in the repository root `node_modules`.

## Configuration

Every variable the API reads is declared in `src/env.ts`, which also rejects an
unusable value at boot with a message naming it. `apps/api/.env.example` lists
them with their defaults; copy it to `.env` to change one locally:

```bash
$ cp apps/api/.env.example apps/api/.env
```

`NODE_ENV=production` is what makes the API a deployed one: it then requires
`CORS_ORIGINS` and enforces the rate limit. Development and test serve no CORS
headers and are not throttled.

The database variables — `DATABASE_URL` and the pool tuning — live next to the
package that reads them, in `packages/db/.env.example`.

## Docker

The repository root holds the image and the stack that runs it with PostgreSQL:

```bash
$ CORS_ORIGINS=http://localhost:3000 docker compose up --build
```

`docker compose stop api` shuts the API down gracefully: the database pool is
closed and the process exits.

## Run tests

```bash
# unit tests
$ npm test -w api

# e2e tests
$ npm run test:e2e -w api

# test coverage
$ npm run test:cov -w api
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
