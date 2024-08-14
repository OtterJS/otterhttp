import { ClientError, NotModifiedError, ServerError } from '@/packages/errors/src'
import { describe, expect, it } from 'vitest'

describe('NotModifiedError', () => {
  it('should be constructible with no arguments', () => {
    expect(() => {
      new NotModifiedError()
    }).not.toThrow()
  })

  it('should be constructible with a message', () => {
    expect(() => {
      new NotModifiedError('message')
    }).not.toThrow()
  })

  it('should be constructible with a message and options', () => {
    expect(() => {
      new NotModifiedError('message', { statusMessage: 'foo bar' })
    }).not.toThrow()
  })

  it('should have statusCode 304', () => {
    expect(new NotModifiedError()).toMatchObject({ statusCode: 304 })
  })

  it('should have statusMessage of "Not Modified"', () => {
    expect(new NotModifiedError()).toMatchObject({ statusMessage: 'Not Modified' })
  })

  it('should respect the statusMessage option', () => {
    expect(new NotModifiedError('bottom text', { statusMessage: 'Is Modified' })).toMatchObject({
      statusMessage: 'Is Modified'
    })
  })

  it('should be expected by default', () => {
    expect(new NotModifiedError()).toMatchObject({ expected: true })
  })

  it('should respect the expected option', () => {
    expect(new NotModifiedError('bottom text', { expected: false }).expected).toBeFalsy()
  })

  it('should have name of "NotModifiedError"', () => {
    expect(new NotModifiedError()).toMatchObject({ name: 'NotModifiedError' })
  })
})

describe('ClientError', () => {
  it('should be constructible with no arguments', () => {
    expect(() => {
      new ClientError()
    }).not.toThrow()
  })

  it('should be constructible with a message', () => {
    expect(() => {
      new ClientError('message')
    }).not.toThrow()
  })

  it('should be constructible with a message and options', () => {
    expect(() => {
      new ClientError('message', { statusCode: 410, statusMessage: 'foo bar' })
    })
  })

  it('should be expected by default', () => {
    expect(new ClientError()).toMatchObject({ expected: true })
  })

  it('should respect the expected option', () => {
    expect(new ClientError('bottom text', { expected: false }).expected).toBeFalsy()
  })

  it('should have name of "ClientError"', () => {
    expect(new ClientError()).toMatchObject({ name: 'ClientError' })
  })

  describe('when status code unspecified', () => {
    const error = () => new ClientError('bottom text')

    it('should have statusMessage of "Bad Request"', () => {
      expect(error()).toMatchObject({ statusMessage: 'Bad Request' })
    })

    it('should have statusCode of 400', () => {
      expect(error()).toMatchObject({ statusCode: 400 })
    })

    it('should respect the statusMessage option', () => {
      expect(new ClientError('bottom text', { statusMessage: 'Good Request' })).toMatchObject({
        statusMessage: 'Good Request'
      })
    })
  })

  describe('when status code 404', () => {
    const error = () => new ClientError('bottom text', { statusCode: 404 })

    it('should have statusMessage of "Not Found"', () => {
      expect(error()).toMatchObject({ statusMessage: 'Not Found' })
    })

    it('should have statusCode of 404', () => {
      expect(error()).toMatchObject({ statusCode: 404 })
    })
  })

  describe('when status code 409', () => {
    const error = () => new ClientError('bottom text', { statusCode: 409 })

    it('should have statusMessage of "Conflict"', () => {
      expect(error()).toMatchObject({ statusMessage: 'Conflict' })
    })

    it('should have statusCode of 409', () => {
      expect(error()).toMatchObject({ statusCode: 409 })
    })
  })
})

describe('ServerError', () => {
  it('should be constructible with no arguments', () => {
    expect(() => {
      new ServerError()
    }).not.toThrow()
  })

  it('should be constructible with a message', () => {
    expect(() => {
      new ServerError('message')
    }).not.toThrow()
  })

  it('should be constructible with a message and options', () => {
    expect(() => {
      new ServerError('message', { statusCode: 502, statusMessage: 'foo bar' })
    })
  })

  it('should be unexpected by default', () => {
    expect(new ServerError().expected).toBeFalsy()
  })

  it('should respect the expected option', () => {
    expect(new ServerError('bottom text', { expected: true })).toMatchObject({ expected: true })
  })

  it('should have name of "ServerError"', () => {
    expect(new ServerError()).toMatchObject({ name: 'ServerError' })
  })

  describe('when status code unspecified', () => {
    const error = () => new ServerError('bottom text')

    it('should have statusMessage of "Internal Server Error"', () => {
      expect(error()).toMatchObject({ statusMessage: 'Internal Server Error' })
    })

    it('should have statusCode of 500', () => {
      expect(error()).toMatchObject({ statusCode: 500 })
    })

    it('should respect the statusMessage option', () => {
      expect(new ClientError('bottom text', { statusMessage: 'External Server Error' })).toMatchObject({
        statusMessage: 'External Server Error'
      })
    })
  })

  describe('when status code 503', () => {
    const error = () => new ServerError('bottom text', { statusCode: 503 })

    it('should have statusMessage of "Service Unavailable"', () => {
      expect(error()).toMatchObject({ statusMessage: 'Service Unavailable' })
    })

    it('should have statusCode of 503', () => {
      expect(error()).toMatchObject({ statusCode: 503 })
    })
  })

  describe('when status code 507', () => {
    const error = () => new ServerError('bottom text', { statusCode: 507 })

    it('should have statusMessage of "Insufficient Storage"', () => {
      expect(error()).toMatchObject({ statusMessage: 'Insufficient Storage' })
    })

    it('should have statusCode of 507', () => {
      expect(error()).toMatchObject({ statusCode: 507 })
    })
  })
})
