import { IncomingMessage, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
import { describe, expect, it } from 'vitest'

import { vary } from '@/packages/vary/src'

function getMockResponse(initialVaryHeader?: string | string[]) {
  const req = new IncomingMessage(undefined as unknown as Socket)
  const res = new ServerResponse(req)
  if (initialVaryHeader != null) res.setHeader('vary', initialVaryHeader)
  return res
}

describe('field', () => {
  it('should accept string', () => {
    const res = getMockResponse()
    expect(() => {
      vary(res, 'foo')
    }).not.toThrow()
  })

  it('should accept string that is Vary header', () => {
    const res = getMockResponse()
    expect(() => {
      vary(res, 'foo, bar')
    }).not.toThrow()
  })

  it('should accept array of string', () => {
    const res = getMockResponse()
    expect(() => {
      vary(res, ['foo', 'bar'])
    }).not.toThrow()
  })

  it('should not allow separator ":"', () => {
    const res = getMockResponse()
    expect(() => {
      vary(res, 'invalid:header')
    }).toThrow(/field.*contains.*invalid/)
  })

  it('should not allow separator " "', () => {
    const res = getMockResponse()
    expect(() => {
      vary(res, 'invalid header')
    }).toThrow(/field.*contains.*invalid/)
  })

  it.each(['\n', '\u0080'])("should not allow non-token character '%s'", (character: string) => {
    const res = getMockResponse()
    expect(() => {
      vary(res, `invalid${character}header`)
    }).toThrow(/field.*contains.*invalid/)
  })
})

describe('when header empty', () => {
  it('should set value', () => {
    const res = getMockResponse()
    vary(res, 'Origin')
    expect(res.getHeader('vary')).toEqual(['Origin'])
  })

  it('should set value with array', () => {
    const res = getMockResponse()
    vary(res, ['Origin', 'User-Agent'])
    expect(res.getHeader('vary')).toEqual(['Origin', 'User-Agent'])
  })

  it('should preserve case', () => {
    const res = getMockResponse()
    vary(res, ['ORIGIN', 'user-agent', 'AccepT'])
    expect(res.getHeader('vary')).toEqual(['ORIGIN', 'user-agent', 'AccepT'])
  })
})

describe('when header has values', () => {
  it('should set value', () => {
    const res = getMockResponse('Accept')
    vary(res, 'Origin')
    expect(res.getHeader('vary')).toEqual(['Accept', 'Origin'])
  })

  it('should set value with array', () => {
    const res = getMockResponse('Accept')
    vary(res, ['Origin', 'User-Agent'])
    expect(res.getHeader('vary')).toEqual(['Accept', 'Origin', 'User-Agent'])
  })

  it('should not duplicate existing value', () => {
    const res = getMockResponse('Accept')
    vary(res, 'Accept')
    expect(res.getHeader('vary')).toEqual(['Accept'])
  })

  it('should compare case-insensitive', () => {
    const res = getMockResponse('Accept')
    vary(res, 'accEPT')
    expect(res.getHeader('vary')).toEqual(['Accept'])
  })

  it('should preserve case', () => {
    const res = getMockResponse('Accept')
    vary(res, 'AccepT')
    expect(res.getHeader('vary')).toEqual(['Accept'])
  })
})

describe('when *', () => {
  it('should set value', () => {
    const res = getMockResponse()
    vary(res, '*')
    expect(res.getHeader('vary')).toEqual(['*'])
  })

  it('should act as if all values already set', () => {
    const value = ['*']
    const res = getMockResponse(value)
    vary(res, 'Origin')
    expect(res.getHeader('vary')).toBe(value)
  })

  it('should eradicate existing values', () => {
    const res = getMockResponse('Accept, Accept-Encoding')
    vary(res, '*')
    expect(res.getHeader('vary')).toEqual(['*'])
  })

  it('should update bad existing header', () => {
    const res = getMockResponse('Accept, Accept-Encoding, *')
    vary(res, 'Origin')
    expect(res.getHeader('vary')).toEqual(['*'])
  })
})

describe('when field is string', () => {
  it('should set value', () => {
    const res = getMockResponse()
    vary(res, 'Accept')
    expect(res.getHeader('vary')).toEqual(['Accept'])
  })

  it('should set value when vary header', () => {
    const res = getMockResponse()
    vary(res, 'Accept, Accept-Encoding')
    expect(res.getHeader('vary')).toEqual(['Accept', 'Accept-Encoding'])
  })

  it('should accept LWS', () => {
    const res = getMockResponse()
    vary(res, '  Accept     ,     Origin    ')
    expect(res.getHeader('vary')).toEqual(['Accept', 'Origin'])
  })

  it('should handle contained *', () => {
    const res = getMockResponse()
    vary(res, 'Accept,*')
    expect(res.getHeader('vary')).toEqual(['*'])
  })
})

describe('when field is array', () => {
  it('should set value', () => {
    const res = getMockResponse()
    vary(res, ['Accept', 'Accept-Language'])
    expect(res.getHeader('vary')).toEqual(['Accept', 'Accept-Language'])
  })

  it('should ignore double-entries', () => {
    const res = getMockResponse()
    vary(res, ['Accept', 'Accept'])
    expect(res.getHeader('vary')).toEqual(['Accept'])
  })

  it('should be case-insensitive', () => {
    const res = getMockResponse()
    vary(res, ['Accept', 'ACCEPT'])
    expect(res.getHeader('vary')).toEqual(['Accept'])
  })

  it('should handle contained *', () => {
    const res = getMockResponse()
    vary(res, ['Origin', 'User-Agent', '*', 'Accept'])
    expect(res.getHeader('vary')).toEqual(['*'])
  })

  it('should handle existing values', () => {
    const res = getMockResponse('Accept, Accept-Encoding')
    vary(res, ['origin', 'accept', 'accept-charset'])
    expect(res.getHeader('vary')).toEqual(['Accept, Accept-Encoding', 'origin', 'accept-charset'])
  })
})
