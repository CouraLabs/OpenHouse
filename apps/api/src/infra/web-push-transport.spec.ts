import { describe, expect, it, vi } from 'vitest'
import type { PushTarget } from '@workspace/business'

import type { PushConfig } from '../config/env.js'
import {
  encryptPayload,
  vapidAuthorization,
  WebPushTransport,
} from './web-push-transport.js'

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

function base64UrlEncode(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function concat(...parts: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const joined = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }

  return joined
}

async function decrypt(
  body: Uint8Array<ArrayBuffer>,
  uaPrivate: CryptoKey,
  uaPublic: Uint8Array<ArrayBuffer>,
  authSecret: Uint8Array<ArrayBuffer>
): Promise<string> {
  const salt = body.slice(0, 16)
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const rs = view.getUint32(16)
  const idlen = body[20]
  const ciphertext = body.slice(21 + idlen)

  expect(idlen).toBe(65)
  expect(rs).toBe(4096)
  const asPublic = body.slice(21, 21 + idlen)

  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: await crypto.subtle.importKey(
          'raw',
          asPublic,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          []
        ),
      },
      uaPrivate,
      256
    )
  )
  const ikm = concat(shared, authSecret)
  const derive = async (
    material: Uint8Array<ArrayBuffer>,
    info: Uint8Array<ArrayBuffer>,
    length: number
  ) => {
    const key = await crypto.subtle.importKey('raw', material, 'HKDF', false, [
      'deriveBits',
    ])

    return new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        key,
        length * 8
      )
    )
  }

  const prkInfo = concat(
    new TextEncoder().encode('WebPush: info'),
    new Uint8Array(1),
    uaPublic,
    asPublic
  )
  const prk = await derive(ikm, prkInfo, 32)
  const cek = await derive(
    prk,
    concat(
      new TextEncoder().encode('Content-Encoding: aes128gcm'),
      new Uint8Array(1)
    ),
    16
  )
  const baseNonce = await derive(
    prk,
    concat(
      new TextEncoder().encode('Content-Encoding: nonce'),
      new Uint8Array(1)
    ),
    12
  )
  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, [
    'decrypt',
  ])

  const recordSize = rs - 1
  let plaintext = new Uint8Array(0)

  for (
    let offset = 0, sequence = 0;
    offset < ciphertext.length;
    offset += recordSize, sequence += 1
  ) {
    const record = ciphertext.slice(offset, offset + recordSize)
    const nonce = baseNonce.slice()

    for (let index = 0; index < 8; index += 1) {
      nonce[nonce.length - 1 - index] ^= (sequence >>> (8 * index)) & 0xff
    }

    const decrypted = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, cekKey, record)
    )

    plaintext = concat(plaintext, decrypted)
  }

  let end = plaintext.length - 1

  while (end > 0 && plaintext[end] === 0) {
    end -= 1
  }

  expect(plaintext[end]).toBe(0x02)

  return new TextDecoder().decode(plaintext.slice(0, end))
}

async function subscription(): Promise<{
  target: PushTarget
  uaPrivate: CryptoKey
  uaPublic: Uint8Array<ArrayBuffer>
  authSecret: Uint8Array<ArrayBuffer>
}> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const uaPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', pair.publicKey)
  )
  const authSecret = crypto.getRandomValues(new Uint8Array(16))

  return {
    target: {
      endpoint: 'https://push.example/send/1',
      keys: {
        p256dh: base64UrlEncode(uaPublic),
        auth: base64UrlEncode(authSecret),
      },
    },
    uaPrivate: pair.privateKey,
    uaPublic,
    authSecret,
  }
}

async function vapidConfig(): Promise<{
  config: PushConfig
  publicKey: CryptoKey
}> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const publicPoint = new Uint8Array(
    await crypto.subtle.exportKey('raw', pair.publicKey)
  )

  return {
    config: {
      publicKey: base64UrlEncode(publicPoint),
      privateKey: jwk.d ?? '',
      subject: 'mailto:admin@kantim.invalid',
    },
    publicKey: pair.publicKey,
  }
}

const PAYLOAD = JSON.stringify({ v: 1, count: 1, url: '/upcoming' })

describe('vapidAuthorization', () => {
  it('signs the JWT with the raw scalar the config carries', async () => {
    const { config, publicKey } = await vapidConfig()
    const authorization = await vapidAuthorization(
      config,
      'https://push.example/send/1'
    )

    expect(authorization.startsWith('vapid t=')).toBe(true)
    expect(authorization.endsWith(`, k=${config.publicKey}`)).toBe(true)

    const token = authorization.slice('vapid t='.length).split(', k=')[0]
    const [header, claims, signature] = token.split('.')

    expect(
      JSON.parse(new TextDecoder().decode(base64UrlDecode(header)))
    ).toEqual({ alg: 'ES256', typ: 'JWT' })
    expect(
      JSON.parse(new TextDecoder().decode(base64UrlDecode(claims)))
    ).toEqual({
      aud: 'https://push.example',
      exp: expect.any(Number),
      sub: config.subject,
    })

    await expect(
      crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        base64UrlDecode(signature),
        new TextEncoder().encode(`${header}.${claims}`)
      )
    ).resolves.toBe(true)
  })

  it('accepts a PKCS#8 spelling of the private key too', async () => {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )
    const der = new Uint8Array(
      await crypto.subtle.exportKey('pkcs8', pair.privateKey)
    )
    const config: PushConfig = {
      publicKey: base64UrlEncode(
        new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
      ),
      privateKey: base64UrlEncode(der),
      subject: 'mailto:admin@kantim.invalid',
    }

    const authorization = await vapidAuthorization(
      config,
      'https://push.example/send/1'
    )
    const token = authorization.slice('vapid t='.length).split(', k=')[0]
    const [header, claims, signature] = token.split('.')

    await expect(
      crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.publicKey,
        base64UrlDecode(signature),
        new TextEncoder().encode(`${header}.${claims}`)
      )
    ).resolves.toBe(true)
  })
})

describe('encryptPayload (RFC 8291 aes128gcm)', () => {
  it('round-trips through an independent decryption of the framing', async () => {
    const subscription_ = await subscription()
    const body = await encryptPayload(subscription_.target, PAYLOAD)

    await expect(
      decrypt(
        body,
        subscription_.uaPrivate,
        subscription_.uaPublic,
        subscription_.authSecret
      )
    ).resolves.toBe(PAYLOAD)
  })

  it('splits a long payload across 4096-byte records, still decryptable', async () => {
    const subscription_ = await subscription()
    const long = JSON.stringify({
      v: 1,
      count: 1,
      url: '/upcoming',
      pad: 'x'.repeat(5000),
    })
    const body = await encryptPayload(subscription_.target, long)

    expect(body.length).toBe(86 + 2 * (4096 - 1))

    await expect(
      decrypt(
        body,
        subscription_.uaPrivate,
        subscription_.uaPublic,
        subscription_.authSecret
      )
    ).resolves.toBe(long)
  })
})

describe('WebPushTransport', () => {
  it('is enabled only with a VAPID pair, and answers its public key', async () => {
    expect(new WebPushTransport(undefined).enabled).toBe(false)
    expect(new WebPushTransport(undefined).publicKey).toBeNull()

    const disabled = new WebPushTransport(undefined)

    await expect(
      disabled.send({ endpoint: '', keys: { p256dh: '', auth: '' } }, '')
    ).rejects.toThrow('Web push is disabled')
  })

  it('posts the encrypted body with the VAPID headers', async () => {
    const { config } = await vapidConfig()
    const subscription_ = await subscription()
    const fetch_ = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetch_)

    const transport = new WebPushTransport(config)

    expect(transport.enabled).toBe(true)
    expect(transport.publicKey).toBe(config.publicKey)
    await transport.send(subscription_.target, PAYLOAD)

    expect(fetch_).toHaveBeenCalledExactlyOnceWith(
      subscription_.target.endpoint,
      {
        method: 'POST',
        headers: {
          Authorization: expect.stringMatching(
            /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/
          ),
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: '86400',
          Urgency: 'normal',
        },
        body: expect.any(Uint8Array),
      }
    )

    vi.unstubAllGlobals()
  })

  it('rejects with the status a push service answered', async () => {
    const { config } = await vapidConfig()
    const subscription_ = await subscription()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('gone', { status: 410 }))
    )

    await expect(
      new WebPushTransport(config).send(subscription_.target, PAYLOAD)
    ).rejects.toMatchObject({ statusCode: 410 })

    vi.unstubAllGlobals()
  })
})
