export interface JwtTtls {
  accessTtlS: number
  refreshTtlS: number
  rememberRefreshTtlS: number
}

export interface AccessTokenClaims {
  sub: string
  typ: 'access'
}

export interface RefreshTokenClaims {
  sub: string
  typ: 'refresh'
  jti: string
  rem: boolean
}

interface UnverifiedClaims {
  sub?: unknown
  typ?: unknown
  jti?: unknown
  rem?: unknown
  iat?: unknown
  exp?: unknown
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(input: string): Uint8Array<ArrayBuffer> {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signHs256(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const headerSegment = encodeBase64Url(
    encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  )
  const payloadSegment = encodeBase64Url(
    encoder.encode(JSON.stringify(payload))
  )
  const signingInput = `${headerSegment}.${payloadSegment}`
  const key = await importHmacKey(secret)
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signingInput)
  )

  return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`
}

export async function verifyHs256(
  token: string,
  secret: string
): Promise<Record<string, unknown>> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts as [
    string,
    string,
    string,
  ]
  const decoder = new TextDecoder()
  const header = JSON.parse(
    decoder.decode(decodeBase64Url(headerSegment))
  ) as Record<string, unknown>
  if (header.alg !== 'HS256') {
    throw new Error('Unsupported algorithm')
  }

  const key = await importHmacKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    decodeBase64Url(signatureSegment),
    new TextEncoder().encode(`${headerSegment}.${payloadSegment}`)
  )
  if (!valid) {
    throw new Error('Invalid signature')
  }

  const payload = JSON.parse(
    decoder.decode(decodeBase64Url(payloadSegment))
  ) as Record<string, unknown>
  const now = Math.floor(Date.now() / 1000)
  if (
    payload.nbf !== undefined &&
    (typeof payload.nbf !== 'number' ||
      !Number.isFinite(payload.nbf) ||
      payload.nbf > now)
  ) {
    throw new Error('Token not yet valid')
  }
  if (
    payload.exp !== undefined &&
    (typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now)
  ) {
    throw new Error('Token expired')
  }
  if (
    payload.iat !== undefined &&
    (typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      now < payload.iat)
  ) {
    throw new Error('Token issued in the future')
  }

  return payload
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly ttls: JwtTtls
  ) {}

  async signAccessToken(userId: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    return signHs256(
      {
        sub: String(userId),
        typ: 'access',
        iat: now,
        exp: now + this.ttls.accessTtlS,
      },
      this.secret
    )
  }

  async signRefreshToken(
    userId: number,
    rememberMe: boolean
  ): Promise<{ token: string; jti: string }> {
    const jti = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)
    const lifetime = rememberMe
      ? this.ttls.rememberRefreshTtlS
      : this.ttls.refreshTtlS

    return {
      token: await signHs256(
        {
          sub: String(userId),
          typ: 'refresh',
          jti,
          rem: rememberMe,
          iat: now,
          exp: now + lifetime,
        },
        this.secret
      ),
      jti,
    }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    const claims = await this.verify(token)

    if (claims === null || typeof claims.sub !== 'string') {
      return null
    }

    return claims.typ === 'access' ? { sub: claims.sub, typ: 'access' } : null
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    const claims = await this.verify(token)

    if (
      claims === null ||
      typeof claims.sub !== 'string' ||
      claims.typ !== 'refresh' ||
      typeof claims.jti !== 'string'
    ) {
      return null
    }

    return {
      sub: claims.sub,
      typ: 'refresh',
      jti: claims.jti,
      rem: claims.rem === true,
    }
  }

  private async verify(token: string): Promise<UnverifiedClaims | null> {
    try {
      const claims = (await verifyHs256(token, this.secret)) as UnverifiedClaims

      return claims
    } catch {
      return null
    }
  }
}
