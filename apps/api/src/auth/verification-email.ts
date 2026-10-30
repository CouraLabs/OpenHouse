import type { MailMessage } from '../common/mail/mailer.js'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function verificationEmail(input: {
  to: string
  name: string
  link: string
}): MailMessage {
  const name = escapeHtml(input.name)
  const link = escapeHtml(input.link)

  return {
    to: input.to,
    subject: 'Confirm your email for OpenHouse',
    text: [
      `Hi ${input.name},`,
      '',
      'Confirm your email to finish creating your OpenHouse account:',
      input.link,
      '',
      'The link works once and expires in 24 hours.',
      "If you didn't sign up, you can ignore this email.",
    ].join('\n'),
    html: [
      '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1917">',
      `<p>Hi ${name},</p>`,
      '<p>Confirm your email to finish creating your OpenHouse account.</p>',
      `<p style="margin:28px 0"><a href="${link}" style="background:#1c1917;color:#fafaf9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Confirm email</a></p>`,
      `<p style="font-size:13px;color:#57534e">Or paste this link into your browser:<br><a href="${link}" style="color:#57534e;word-break:break-all">${link}</a></p>`,
      '<p style="font-size:13px;color:#57534e">The link works once and expires in 24 hours. If you didn\'t sign up, you can ignore this email.</p>',
      '</div>',
    ].join(''),
  }
}
