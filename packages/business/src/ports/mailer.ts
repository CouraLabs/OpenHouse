import type { MailMessage } from '@workspace/domain'

export type { MailMessage }

export abstract class Mailer {
  abstract send(message: MailMessage): Promise<void>
}
