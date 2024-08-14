import fs from 'node:fs'
import path from 'node:path'
import { makeFetch } from 'supertest-fetch'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { App } from '@/packages/app/src'
import { json, send, sendFile, sendStatus } from '@/packages/send/src'
import { runServer } from '@/test_helpers/runServer'

describe('json(body)', () => {
  it('should send a json-stringified reply when an object is passed', async () => {
    const app = runServer((_, res) => void json(res, { hello: 'world' }))

    await makeFetch(app)('/').expect({ hello: 'world' })
  })
  it('should set a content-type header properly', async () => {
    const app = runServer((_, res) => void json(res, { hello: 'world' }))

    await makeFetch(app)('/').expectHeader('content-type', 'application/json; charset=utf-8')
  })
  it('should send a reply of length 0 when null is passed', async () => {
    const app = runServer((_, res) => void json(res, null))

    await makeFetch(app)('/').expectHeader('content-length', '0')
  })
  it('should be able to respond with booleans', async () => {
    const app = runServer((_, res) => void json(res, true))

    await makeFetch(app)('/').expectBody('true')
  })
  it('should be able to respond with numbers', async () => {
    const app = runServer((_, res) => void json(res, 123))

    await makeFetch(app)('/').expectBody('123')
  })
  it('should be able to respond with strings', async () => {
    const app = runServer((_, res) => void json(res, 'hello'))

    await makeFetch(app)('/').expectBody('hello')
  })
})

describe('send(body)', () => {
  it('should send a plain text', async () => {
    const app = runServer((_, res) => void send(res, 'Hello World'))

    await makeFetch(app)('/').expect('Hello World')
  })
  it('should set HTML content-type header when sending plain text', async () => {
    const app = runServer((_, res) => void send(res, 'Hello World'))

    await makeFetch(app)('/').expectHeader('Content-Type', 'text/html; charset=utf-8')
  })
  it('should generate an eTag on a plain text response', async () => {
    const app = runServer((_, res) => void send(res, 'Hello World'))

    await makeFetch(app)('/').expectHeader('etag', 'W/"b-Ck1VqNd45QIvq3AZd8XYQLvEhtA"')
  })
  it('should send a buffer', async () => {
    const app = runServer((_, res) => void send(res, Buffer.from('Hello World')))

    await makeFetch(app)('/').expect('Hello World')
  })
  it('should send nothing on a HEAD request', async () => {
    const app = runServer((_, res) => void send(res, 'Hello World'))

    await makeFetch(app)('/', {
      method: 'HEAD'
    }).expectBody('')
  })
  it('should send nothing if body is empty', async () => {
    const app = runServer((_, res) => void send(res, null))

    await makeFetch(app)('/').expectBody('')
  })
  it('should remove some headers for 204 status', async () => {
    const app = runServer((_, res) => {
      res.statusCode = 204

      send(res, 'Hello World')
    })

    await makeFetch(app)('/')
      .expectHeader('Content-Length', null)
      .expectHeader('Content-Type', null)
      .expectHeader('Transfer-Encoding', null)
  })
  it('should remove some headers for 304 status', async () => {
    const app = runServer((_, res) => {
      res.statusCode = 304

      send(res, 'Hello World')
    })

    await makeFetch(app)('/')
      .expectHeader('Content-Length', null)
      .expectHeader('Content-Type', null)
      .expectHeader('Transfer-Encoding', null)
  })
  it("should set Content-Type to application/octet-stream for buffers if the header hasn't been set before", async () => {
    const app = runServer((_, res) => {
      send(res, Buffer.from('Hello World', 'utf-8'))
      res.end()
    })

    await makeFetch(app)('/').expectHeader('Content-Type', 'application/octet-stream')
  })
  it('should set 304 status for fresh requests', async () => {
    const etag = 'abc'

    const app = new App()

    const server = app.listen()

    app.use((_, res) => {
      const str = Array(1000).join('-')
      res.setHeader('ETag', etag).send(str)
    })

    await makeFetch(server)('/', {
      headers: {
        'If-None-Match': etag
      }
    }).expectStatus(304)
  })
})

describe('status(status)', () => {
  it('sets response status', async () => {
    const app = runServer((_, res) => {
      void sendStatus(res, 418)
      res.end()
    })

    await makeFetch(app)('/').expectStatus(418)
  })
})

describe('sendStatus(status)', () => {
  it(`should send "I'm a teapot" when argument is 418`, async () => {
    const app = runServer((_, res) => {
      sendStatus(res, 418)
      res.end()
    })

    await makeFetch(app)('/').expect("I'm a Teapot")
  })
})

describe('sendFile(path)', () => {
  const testFilePath = path.resolve(import.meta.dirname, '..', 'fixtures', 'test-send-file.txt')

  beforeAll(() => {
    fs.writeFileSync(testFilePath, 'Hello World')
  })

  afterAll(() => {
    fs.unlinkSync(testFilePath)
  })

  it('should send the file', async () => {
    const app = runServer(async (_, res) => {
      await sendFile(res, testFilePath, {})
    })

    await makeFetch(app)('/').expect('Hello World')
  })

  it('should throw if path is not absolute', async () => {
    const app = runServer(async (_, res) => {
      await expect(sendFile(res, '../relative/path', {})).rejects.toThrow(/absolute/)
    })

    await makeFetch(app)('/')
  })
  it('should set the Content-Type header based on the filename', async () => {
    const app = runServer(async (_, res) => {
      await sendFile(res, testFilePath, {})
    })

    await makeFetch(app)('/').expectHeader('Content-Type', 'text/plain; charset=utf-8')
  })
  it('should inherit the previously set Content-Type header', async () => {
    const app = runServer(async (_, res) => {
      res.setHeader('Content-Type', 'text/markdown')

      await sendFile(res, testFilePath, {})
    })

    await makeFetch(app)('/').expectHeader('Content-Type', 'text/markdown; charset=utf-8')
  })
  it('should allow custom headers through the options param', async () => {
    const HEADER_NAME = 'Test-Header'
    const HEADER_VALUE = 'Hello World'

    const app = runServer(async (_, res) => {
      await sendFile(res, testFilePath, { headers: { [HEADER_NAME]: HEADER_VALUE } })
    })

    await makeFetch(app)('/').expectHeader(HEADER_NAME, HEADER_VALUE)
  })

  it('should support Range header', async () => {
    const app = runServer(async (_, res) => {
      await sendFile(res, testFilePath)
    })

    await makeFetch(app)('/', {
      headers: {
        Range: 'bytes=0-4'
      }
    })
      .expectStatus(206)
      .expect('Content-Length', '5')
      .expect('Accept-Ranges', 'bytes')
      .expect('Hello')
  })
  it('should send 419 if out of range', async () => {
    const app = runServer(async (_, res) => {
      await sendFile(res, testFilePath)
    })
    await makeFetch(app)('/', {
      headers: {
        Range: 'bytes=0-666'
      }
    })
      .expectStatus(416)
      .expectHeader('Content-Range', 'bytes */11')
  })
  it('should set default encoding to UTF-8', async () => {
    const app = runServer(async (_, res) => {
      await sendFile(res, testFilePath)
    })
    await makeFetch(app)('/').expectStatus(200).expectHeader('Content-Encoding', 'utf-8')
  })
  it('should inherit the previously set status code', async () => {
    const app = runServer(async (_, res) => {
      res.statusCode = 418
      await sendFile(res, testFilePath)
    })

    await makeFetch(app)('/').expectStatus(418)
  })
})
