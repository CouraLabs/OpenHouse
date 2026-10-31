import {
  PushRejectedError,
  PushTransport,
  type PushTarget,
} from '@workspace/business'
import type { PushConfig } from '../config/env.js'

export { PushRejectedError, PushTransport, type PushTarget }

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function base64UrlEncode(
  bytes: Uint8Array<ArrayBuffer> | Uint8Array
): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function concat(
  ...parts: readonly Uint8Array<ArrayBuffer>[]
): Uint8Array<ArrayBuffer> {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const joined = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }

  return joined
}

async function importPrivateKey(config: PushConfig): Promise<CryptoKey> {
  const raw = base64UrlDecode(config.privateKey)

  if (raw.length === 32) {
    return crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        d: base64UrlEncode(raw),
        x: base64UrlEncode(base64UrlDecode(config.publicKey).slice(1, 33)),
        y: base64UrlEncode(base64UrlDecode(config.publicKey).slice(33, 65)),
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
  }

  return crypto.subtle.importKey(
    'pkcs8',
    raw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

export async function vapidAuthorization(
  config: PushConfig,
  endpoint: string
): Promise<string> {
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  )
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: config.subject,
  }
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claims))
  )
  const key = await importPrivateKey(config)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  )

  return `vapid t=${header}.${payload}.${base64UrlEncode(new Uint8Array(signature))}, k=${config.publicKey}`
}

async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  )

  return new Uint8Array(bits)
}

function nonceFor(
  nonce: Uint8Array<ArrayBuffer>,
  sequence: number
): Uint8Array<ArrayBuffer> {
  const derived = new Uint8Array(nonce)

  for (let index = 0; index < 8; index += 1) {
    derived[derived.length - 1 - index] ^= (sequence >>> (8 * index)) & 0xff
  }

  return derived
}

export async function encryptPayload(
  target: PushTarget,
  payload: string
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = base64UrlDecode(target.keys.p256dh)
  const authSecret = base64UrlDecode(target.keys.auth)
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: uaKey },
      ephemeral.privateKey,
      256
    )
  )
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeral.publicKey)
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const ikm = concat(shared, authSecret)
  const prk = await hkdf(
    salt,
    ikm,
    concat(
      new TextEncoder().encode('WebPush: info'),
      new Uint8Array(1),
      uaPublic,
      asPublic
    ),
    32
  )
  const cek = await hkdf(
    salt,
    prk,
    concat(
      new TextEncoder().encode('Content-Encoding: aes128gcm'),
      new Uint8Array(1)
    ),
    16
  )
  const nonce = await hkdf(
    salt,
    prk,
    concat(
      new TextEncoder().encode('Content-Encoding: nonce'),
      new Uint8Array(1)
    ),
    12
  )
  const cekKey = await crypto.subtle.importKey(
    'raw',
    cek,
    'AES-GCM',
    false,
    ['encrypt']
  )

  const RS = 4096
  const maxPlaintext = RS - 17
  const plaintext = new TextEncoder().encode(payload)
  const records: Uint8Array<ArrayBuffer>[] = []

  for (
    let start = 0;
    start < plaintext.length || start === 0;
    start += maxPlaintext
  ) {
    const chunk = plaintext.subarray(start, start + maxPlaintext)
    const last = start + maxPlaintext >= plaintext.length
    const record = new Uint8Array(maxPlaintext)

    record.set(chunk)
    record[chunk.length] = last ? 0x02 : 0x01

    const sequence = records.length
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonceFor(nonce, sequence) },
        cekKey,
        record
      )
    )

    records.push(encrypted)
  }

  const header = concat(
    salt,
    new Uint8Array([0, 0, RS >> 8, RS & 0xff]),
    new Uint8Array([asPublic.length]),
    asPublic
  )

  return concat(header, ...records)
}

export class WebPushTransport extends PushTransport {
  readonly enabled: boolean
  readonly publicKey: string | null

  constructor(private readonly config?: PushConfig) {
    super()
    this.enabled = config !== undefined
    this.publicKey = config?.publicKey ?? null
  }

  async send(target: PushTarget, payload: string): Promise<void> {
    if (this.config === undefined) {
      throw new Error('Web push is disabled: no VAPID keys are configured.')
    }

    const [authorization, body] = await Promise.all([
      vapidAuthorization(this.config, target.endpoint),
      encryptPayload(target, payload),
    ])

    const response = await fetch(target.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'normal',
      },
      body,
    })

    if (!response.ok) {
      throw new PushRejectedError(
        response.status,
        `The push service answered ${response.status}.`
      )
    }
  }
}
