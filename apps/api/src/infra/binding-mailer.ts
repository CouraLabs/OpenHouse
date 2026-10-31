import { Mailer, type MailMessage } from '@workspace/business'

export interface SendEmailBinding {
  send(message: {
    from: { email: string; name?: string }
    to: string
    subject: string
    text: string
    html: string
  }): Promise<unknown>
}

export class BindingMailer extends Mailer {
  constructor(
    private readonly binding: SendEmailBinding | undefined,
    private readonly from: { email: string; name?: string }
  ) {
    super()
  }

  async send(message: MailMessage): Promise<void> {
    if (this.binding === undefined) {
      console.log(
        JSON.stringify({
          kind: 'mail.unsent',
          to: message.to,
          subject: message.subject,
          text: message.text,
        })
      )

      return
    }

    await this.binding.send({ from: this.from, ...message })
  }
}
