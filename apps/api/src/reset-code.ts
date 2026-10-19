import { NestFactory } from '@nestjs/core'

import { PasswordResetService } from './auth/password-reset.service.js'
import { ResetCodeCliModule } from './auth/reset-code-cli.module.js'

/**
 * The last-resort password recovery of a self-hosted deployment: prints a
 * one-time reset code for the user an email names, valid for 30 minutes.
 * It runs with server access only — no HTTP route issues these codes — and
 * the issued code is recorded, so the user is told at their next sign-in.
 *
 *   docker compose exec api npm run reset-code -- --email owner@example.com
 */
async function resetCode(): Promise<void> {
  const email = emailArgument(process.argv.slice(2))
  if (email === undefined) {
    process.stderr.write(
      'Usage: npm run reset-code -- --email owner@example.com\n'
    )
    process.exitCode = 2
    return
  }

  const app = await NestFactory.createApplicationContext(ResetCodeCliModule, {
    logger: ['error'],
  })

  try {
    const issued = await app.get(PasswordResetService).issueFromServer(email)

    process.stdout.write(
      [
        `Reset code for ${issued.user.email}: ${issued.code}`,
        `It works once, until ${issued.expiresAt.toISOString()} (30 minutes).`,
        'Open /reset-password in the web app and enter it with a new password.',
        '',
      ].join('\n')
    )
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  } finally {
    await app.close()
  }
}

/** The value of `--email <value>` or `--email=<value>`. */
function emailArgument(args: string[]): string | undefined {
  const index = args.indexOf('--email')
  const value =
    index === -1
      ? args.find((arg) => arg.startsWith('--email='))?.slice('--email='.length)
      : args[index + 1]

  return value === undefined || value.trim() === '' ? undefined : value.trim()
}

await resetCode()
