import path from 'node:path'
import { makeFetch } from 'supertest-fetch'
import { describe, expect, it } from 'vitest'

import { sign } from '@/packages/cookie-signature'
import type { Response } from '@/packages/res/src'
import { runServer } from '@/test_helpers/runServer'

function writeError(res: Response, err: unknown) {
  if (err instanceof Error && 'status' in err) {
    return res.writeHead(err.status as number).end(err.message)
  }
  return res.writeHead(500).end('unknown error occurred')
}

describe('Response extensions', () => {
  describe('res.setHeader(field, val)', () => {
    it('should set a string header with a string value', async () => {
      const app = runServer((_, res) => {
        res.setHeader('hello', 'World')
        res.end()
      })

      await makeFetch(app)('/').expectHeader('hello', 'World')
    })
    it('should set an array of header values', async () => {
      const app = runServer((_, res) => {
        res.setHeader('foo', ['bar', 'baz'])
        res.end()
      })

      await makeFetch(app)('/').expectHeader('foo', 'bar, baz')
    })
    it('should set a charset if one is not already set', async () => {
      const app = runServer((_, res) => {
        res.setHeader('content-type', 'text/plain')
        res.end()
      })

      await makeFetch(app)('/').expectHeader('content-type', 'text/plain; charset=utf-8')
    })
    it('should not set a charset if one is already set', async () => {
      const app = runServer((_, res) => {
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        res.end()
      })

      await makeFetch(app)('/').expectHeader('content-type', 'text/plain; charset=utf-8')
    })
  })
  describe('res.setHeaders(fields)', () => {
    it('maps keys to values', async () => {
      const app = runServer((_, res) => {
        res.setHeaders({ foo: 'bar' })
        res.end()
      })

      await makeFetch(app)('/').expectHeader('foo', 'bar')
    })
  })
  describe('res.getHeader(field)', () => {
    it('should get a header with a specified field', async () => {
      const app = runServer((_, res) => {
        res.setHeader('hello', 'World')
        res.end(res.getHeader('hello'))
      })

      await makeFetch(app)('/').expect('World')
    })
  })
  describe('res.vary(field)', () => {
    it('should set a "Vary" header properly', async () => {
      const app = runServer((_, res) => {
        res.vary('User-Agent').end()
      })

      await makeFetch(app)('/').expect('Vary', 'User-Agent')
    })
  })
  describe('res.redirect(url, status)', () => {
    it('should set 302 status and message about redirecting', async () => {
      const app = runServer(async (_req, res) => {
        await res.redirect('/abc')
        res.end()
      })

      await makeFetch(app)('/', {
        redirect: 'manual'
      }).expect(302, 'Found. Redirecting to /abc')
    })
    it('should follow the redirect', async () => {
      const app = runServer(async (req, res) => {
        if (req.url === '/abc') {
          res.writeHead(200).end('Hello World')
        } else {
          await res.redirect('/abc')
          res.end()
        }
      })

      await makeFetch(app)('/', {
        redirect: 'follow'
      }).expect(200, 'Hello World')
    })
    it('should send an HTML link to redirect to', async () => {
      const app = runServer(async (req, res) => {
        if (req.url === '/abc') {
          res.writeHead(200).end('Hello World')
        } else {
          await res.redirect('/abc')
          res.end()
        }
      })

      await makeFetch(app)('/', {
        redirect: 'manual',
        headers: {
          Accept: 'text/html'
        }
      }).expect(302, '<p>Found. Redirecting to <a href="/abc">/abc</a></p>')
    })
    it('should send an empty response for unsupported MIME types', async () => {
      const app = runServer(async (_req, res) => {
        try {
          await res.redirect('/abc')
          res.end()
        } catch (err) {
          writeError(res, err)
        }
      })

      await makeFetch(app)('/', {
        redirect: 'manual',
        headers: {
          Accept: 'image/jpeg,image/webp'
        }
      }).expect(302, '')
    })
  })
  describe('res.format(obj)', () => {
    it('should send text by default', async () => {
      const app = runServer(async (_req, res) => {
        await res.format({
          text: () => void res.end('Hello World')
        })
      })

      await makeFetch(app)('/').expect(200, 'Hello World')
    })
    it('should send HTML if specified in "Accepts" header', async () => {
      const app = runServer(async (_req, res) => {
        await res.format({
          text: () => void res.end('Hello World'),
          html: () => void res.end('<h1>Hello World</h1>')
        })
      })

      await makeFetch(app)('/', {
        headers: {
          Accept: 'text/html'
        }
      })
        .expect(200, '<h1>Hello World</h1>')
        .expectHeader('Content-Type', 'text/html; charset=utf-8')
    })
    it('should throw 406 status when invalid MIME is specified', async () => {
      const app = runServer(async (_req, res) => {
        try {
          await res.format({
            text: () => void res.end('Hello World')
          })
        } catch (err) {
          writeError(res, err)
        }
      })

      await makeFetch(app)('/', {
        headers: {
          Accept: 'foo/bar'
        }
      }).expect(406, 'Not Acceptable')
    })
    it('should call `default` as a function if specified', async () => {
      const app = runServer(async (_req, res) => {
        await res.format({
          default: () => void res.end('Hello World')
        })
        res.end()
      })

      await makeFetch(app)('/').expect(200, 'Hello World')
    })
  })
  describe('res.type(type)', () => {
    it('should detect MIME type', async () => {
      const app = runServer((_, res) => {
        res.contentType('html').end()
      })

      await makeFetch(app)('/').expect('Content-Type', 'text/html; charset=utf-8')
    })
    it('should detect MIME type by extension', async () => {
      const app = runServer((_, res) => {
        res.contentType('.html').end()
      })

      await makeFetch(app)('/').expect('Content-Type', 'text/html; charset=utf-8')
    })
  })
  describe('res.attachment(filename)', () => {
    it('should set Content-Disposition without a filename specified', async () => {
      const app = runServer((_, res) => {
        res.attachment().end()
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment')
    })
    it('should set Content-Disposition with a filename specified', async () => {
      const app = runServer((_, res) => {
        res.attachment(path.resolve(import.meta.dirname, '..', 'fixtures', 'favicon.ico')).end()
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment; filename="favicon.ico"')
    })
  })
  describe('res.download(filename)', () => {
    it('should set Content-Disposition based on path', async () => {
      const app = runServer(async (_req, res) => {
        await res.download(path.resolve(import.meta.dirname, '..', 'fixtures', 'favicon.ico'))
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment; filename="favicon.ico"')
    })
    it('should set Content-Disposition based on filename', async () => {
      const app = runServer(async (_req, res) => {
        await res.download(path.resolve(import.meta.dirname, '..', 'fixtures', 'favicon.ico'), 'favicon.icon')
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment; filename="favicon.icon"')
    })
    it('should raise errors without closing response socket', async () => {
      const app = runServer(async (_req, res) => {
        await expect(
          res.download(path.resolve(import.meta.dirname, '..', 'fixtures'), 'some_file.png')
        ).rejects.toThrow(/EISDIR/)
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment; filename="some_file.png"')
    })
    it('should set "root" from options', async () => {
      const app = runServer(async (_req, res) => {
        await res.download('favicon.ico', 'favicon.ico', {
          root: path.resolve(import.meta.dirname, '..', 'fixtures')
        })
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment; filename="favicon.ico"')
    })
    it(`'should pass options to sendFile's ReadStream'`, async () => {
      const app = runServer(async (_req, res) => {
        await res.download(path.resolve(import.meta.dirname, '..', 'fixtures', 'favicon.ico'), 'favicon.ico', {
          encoding: 'ascii'
        })
      })

      await makeFetch(app)('/').expect('Content-Disposition', 'attachment; filename="favicon.ico"')
    })
    it('should set headers from options', async () => {
      const app = runServer(async (_req, res) => {
        await res.download(path.resolve(import.meta.dirname, '..', 'fixtures', 'favicon.ico'), 'favicon.ico', {
          headers: {
            'X-Custom-Header': 'Value'
          }
        })
      })

      await makeFetch(app)('/')
        .expect('Content-Disposition', 'attachment; filename="favicon.ico"')
        .expect('X-Custom-Header', 'Value')
    })
  })
  describe('res.cookie(name, value, options)', () => {
    it('serializes the cookie and puts it in a Set-Cookie header', async () => {
      const app = runServer(async (_req, res) => {
        await res.cookie('hello', 'world')
        res.end()

        expect(res.getHeader('Set-Cookie')).toBe('hello=world; Path=/')
      })

      await makeFetch(app)('/').expect(200)
    })
    it('sets default path to "/" if not specified in options', async () => {
      const app = runServer(async (_req, res) => {
        await res.cookie('hello', 'world')
        res.end()

        expect(res.getHeader('Set-Cookie')).toContain('Path=/')
      })

      await makeFetch(app)('/').expect(200)
    })
    it('should use encode function if provided', async () => {
      const encode = (value: string) => `s:${sign(value, 'foo')}`
      const app = runServer(async (_req, res) => {
        await res.cookie('hello', 'world', { encode })
        res.end()
      })

      const response = await makeFetch(app)('/')
      const cookies = new Headers(response.headers).getSetCookie()
      expect(cookies).toContain(`hello=${encodeURIComponent(encode('world'))}; Path=/`)
    })
    it('should set "maxAge" and "expires" from options', async () => {
      const maxAge = 3600 * 24 * 365

      const app = runServer(async (_req, res) => {
        await res.cookie('hello', 'world', {
          maxAge
        })
        res.end()

        expect(res.getHeader('Set-Cookie')).toContain(`Max-Age=${maxAge / 1000}; Path=/; Expires=`)
      })

      await makeFetch(app)('/').expect(200)
    })
    it('should append to Set-Cookie if called multiple times', async () => {
      const app = runServer(async (_req, res) => {
        await res.cookie('hello', 'world')
        await res.cookie('foo', 'bar')
        res.end()
      })

      await makeFetch(app)('/').expect(200).expectHeader('Set-Cookie', 'hello=world; Path=/, foo=bar; Path=/')
    })
  })
  describe('res.clearCookie(name, options)', () => {
    it('sets path to "/" if not specified in options', async () => {
      const app = runServer(async (_req, res) => {
        await res.clearCookie('cookie')
        res.end()

        expect(res.getHeader('Set-Cookie')).toContain('Path=/;')
      })

      await makeFetch(app)('/').expect(200)
    })
  })
  describe('res.appendHeader(field,value)', () => {
    it('sets new header if header not present', async () => {
      const app = runServer((_, res) => {
        res.appendHeader('hello', 'World')
        res.end()
      })

      await makeFetch(app)('/').expectHeader('hello', 'World')
    })
    it('appends value to existing header value', async () => {
      const app = runServer((_, res) => {
        res.setHeader('hello', 'World1')
        res.appendHeader('hello', 'World2')
        res.end()
      })

      await makeFetch(app)('/').expectHeader('hello', ['World1', 'World2'])
    })
    it('appends value to existing header array', async () => {
      const app = runServer((_, res) => {
        res.setHeader('hello', ['World1', 'World2'])
        res.appendHeader('hello', 'World3')
        res.end()
      })

      await makeFetch(app)('/').expectHeader('hello', ['World1', 'World2', 'World3'])
    })
    it('appends value array to existing header value', async () => {
      const app = runServer((_, res) => {
        res.setHeader('hello', 'World1')
        res.appendHeader('hello', ['World2', 'World3'])
        res.end()
      })

      await makeFetch(app)('/').expectHeader('hello', ['World1', 'World2', 'World3'])
    })
  })
  describe('res.links(obj)', () => {
    it('should set "Links" header field', async () => {
      const app = runServer((_, res) => {
        res
          .links({
            next: 'http://api.example.com/users?page=2',
            last: 'http://api.example.com/users?page=5'
          })
          .end()
      })

      await makeFetch(app)('/')
        .expectHeader(
          'Link',
          '<http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last"'
        )
        .expectStatus(200)
    })
    it('should set "Links" for multiple calls', async () => {
      const app = runServer((_, res) => {
        res.links({
          next: 'http://api.example.com/users?page=2',
          last: 'http://api.example.com/users?page=5'
        })

        res.links({
          prev: 'http://api.example.com/users?page=1'
        })

        res.end()
      })

      await makeFetch(app)('/')
        .expectHeader(
          'Link',
          '<http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last", <http://api.example.com/users?page=1>; rel="prev"'
        )
        .expectStatus(200)
    })
  })

  describe('res.location(url)', () => {
    it('sets the "Location" header', async () => {
      const app = runServer((_, res) => {
        res.location('https://example.com').end()
      })

      await makeFetch(app)('/').expectHeader('Location', 'https://example.com').expectStatus(200)
    })
    it('should encode URL', async () => {
      const app = runServer((_req, res) => {
        res.location('https://google.com?q=\u2603 §10').end()
      })

      await makeFetch(app)('/').expectHeader('Location', 'https://google.com?q=%E2%98%83%20%C2%A710').expectStatus(200)
    })
    it('should not touch encoded sequences', async () => {
      const app = runServer((_req, res) => {
        res.location('https://google.com?q=%A710').end()
      })

      await makeFetch(app)('/').expectHeader('Location', 'https://google.com?q=%A710').expectStatus(200)
    })
  })

  describe('res.fresh', () => {
    it('returns false if method is neither GET nor HEAD', async () => {
      const app = runServer((_req, res) => {
        res.end(res.isFresh() ? 'fresh' : 'stale')
      })

      await makeFetch(app)('/', {
        method: 'POST',
        body: 'Hello World'
      }).expect('stale')
    })
    it('returns true when the resource is not modified', async () => {
      const etag = '123'
      const app = runServer((_req, res) => {
        res.setHeader('ETag', etag)

        res.end(res.isFresh() ? 'fresh' : 'stale')
      })

      await makeFetch(app)('/', {
        headers: {
          'If-None-Match': etag
        }
      }).expect('fresh')
    })
    it('should return false when the resource is modified', async () => {
      const etag = '123'
      const app = runServer((_req, res) => {
        res.setHeader('ETag', etag)

        res.end(res.isFresh() ? 'fresh' : 'stale')
      })

      await makeFetch(app)('/', {
        headers: {
          'If-None-Match': '12345'
        }
      }).expect('stale')
    })
    it('returns false if status code is neither >=200 nor < 300, nor 304', async () => {
      const app = runServer((_req, res) => {
        res.statusCode = 418

        res.end(res.isFresh() ? 'fresh' : 'stale')
      })

      await makeFetch(app)('/').expect('stale')
    })
  })
})
