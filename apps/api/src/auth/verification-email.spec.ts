import { describe, expect, it } from 'vitest'

import { verificationEmail } from './verification-email.js'

describe('verificationEmail', () => {
  it('carries the link in both bodies and escapes the name in html', () => {
    const message = verificationEmail({
      to: 'ana@example.com',
      name: '<b>Ana</b>',
      link: 'https://openhouse.couralabs.dev/app/verify-email?token=abc',
    })

    expect(message.to).toBe('ana@example.com')
    expect(message.text).toContain(
      'https://openhouse.couralabs.dev/app/verify-email?token=abc'
    )
    expect(message.html).toContain('&lt;b&gt;Ana&lt;/b&gt;')
    expect(message.html).not.toContain('<b>Ana</b>')
  })
})
