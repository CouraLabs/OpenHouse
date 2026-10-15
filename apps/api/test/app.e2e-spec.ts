import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types.js'
import { AppModule } from './../src/app.module.js'

describe('the session guard (e2e)', () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('rejects a request without a session', () => {
    return request(app.getHttpServer()).get('/').expect(401).expect({
      message: 'Missing session.',
      error: 'Unauthorized',
      statusCode: 401,
    })
  })

  it('rejects a request whose access cookie does not verify', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Cookie', ['openhouse_access=not-a-token'])
      .expect(401)
  })
})
