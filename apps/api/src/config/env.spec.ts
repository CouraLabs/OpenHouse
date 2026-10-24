import {
  getCorsOrigins,
  getExportDir,
  getJwtSecret,
  getJwtTtls,
  getPositiveInt,
  isProduction,
  validateEnv,
} from './env.js'

describe('validateEnv', () => {
  it('rejects an environment it does not know', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(
      'NODE_ENV must be one of development, test, production'
    )
  })

  it('runs in development when NODE_ENV is unset', () => {
    expect(validateEnv({})).toMatchObject({ NODE_ENV: 'development' })
  })

  it('requires the origins a production deployment serves', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      'CORS_ORIGINS'
    )
    expect(() =>
      validateEnv({ NODE_ENV: 'production', CORS_ORIGINS: '  ' })
    ).toThrow('CORS_ORIGINS')
  })

  it('accepts the origins a production deployment serves', () => {
    const config = {
      NODE_ENV: 'production',
      CORS_ORIGINS: 'http://localhost:3000',
      JWT_SECRET: 's3cret',
    }

    expect(validateEnv(config)).toMatchObject(config)
  })

  it('rejects a variable it does not read', () => {
    expect(() => validateEnv({ THROTTLE_LIMITS: '5' })).toThrow(
      'THROTTLE_LIMITS is not read'
    )
  })

  it('rejects a number that is not a positive integer', () => {
    expect(() => validateEnv({ DB_POOL_MAX: 'zero' })).toThrow(
      'DB_POOL_MAX must be a positive integer'
    )
    expect(() => validateEnv({ PORT: '0' })).toThrow(
      'PORT must be a positive integer'
    )
  })

  it('allows a development boot without JWT_SECRET', () => {
    expect(() => validateEnv({})).not.toThrow()
  })

  it('requires JWT_SECRET in production', () => {
    expect(() =>
      validateEnv({ NODE_ENV: 'production', CORS_ORIGINS: 'http://x' })
    ).toThrow('JWT_SECRET is required when NODE_ENV is production.')

    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'http://x',
        JWT_SECRET: 's3cret',
      })
    ).not.toThrow()
  })

  it('leaves the variables a host injects untouched', () => {
    expect(validateEnv({ PATH: '/usr/bin', HOSTNAME: 'web-1' })).toMatchObject({
      PATH: '/usr/bin',
      HOSTNAME: 'web-1',
    })
  })
})

describe('the parsing helpers', () => {
  const previous = { ...process.env }

  afterEach(() => {
    process.env = { ...previous }
  })

  it('splits and trims the origins CORS_ORIGINS lists', () => {
    process.env.CORS_ORIGINS =
      ' http://localhost:3000 , https://openhouse.example '

    expect(getCorsOrigins()).toEqual([
      'http://localhost:3000',
      'https://openhouse.example',
    ])
  })

  it('reports no origins when CORS_ORIGINS is unset or empty', () => {
    delete process.env.CORS_ORIGINS
    expect(getCorsOrigins()).toBeUndefined()

    process.env.CORS_ORIGINS = '  '
    expect(getCorsOrigins()).toBeUndefined()
  })

  it('falls back when a number is unset or unusable', () => {
    delete process.env.PORT
    expect(getPositiveInt('PORT', 3000)).toBe(3000)

    process.env.PORT = '8080'
    expect(getPositiveInt('PORT', 3000)).toBe(8080)

    process.env.PORT = 'zero'
    expect(getPositiveInt('PORT', 3000)).toBe(3000)
  })

  it('falls back to the development secret and default TTLs', () => {
    delete process.env.JWT_SECRET
    delete process.env.JWT_ACCESS_TTL_S
    delete process.env.JWT_REFRESH_TTL_S
    delete process.env.JWT_REMEMBER_REFRESH_TTL_S

    expect(getJwtSecret()).toBe('development-only-secret')
    expect(getJwtTtls()).toEqual({
      accessTtlS: 900,
      refreshTtlS: 86_400,
      rememberRefreshTtlS: 2_592_000,
    })
  })

  it('reports production only when NODE_ENV says so', () => {
    process.env.NODE_ENV = 'production'
    expect(isProduction()).toBe(true)

    process.env.NODE_ENV = 'test'
    expect(isProduction()).toBe(false)
  })
})

describe('getExportDir', () => {
  afterEach(() => {
    delete process.env.EXPORT_DIR
  })

  it('uses EXPORT_DIR, falling back to a folder under the temp directory', () => {
    expect(getExportDir()).toMatch(/openhouse-exports$/)

    process.env.EXPORT_DIR = '/var/tmp/exports'
    expect(getExportDir()).toBe('/var/tmp/exports')
    expect(() => validateEnv({ EXPORT_DIR: '/x', EXPORT_DIRS: '1' })).toThrow(
      'EXPORT_DIRS is not read'
    )
  })
})
