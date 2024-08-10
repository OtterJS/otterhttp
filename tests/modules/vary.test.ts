import { append } from '@/packages/vary/src'
import { describe, expect, it } from 'vitest'

describe('field', () => {
  it('should accept string', () => {
    expect(() => {
      append("", "foo")
    }).not.toThrow()
  })

  it('should accept string that is Vary header', () => {
    expect(() => {
      append("", 'foo, bar')
    }).not.toThrow()
  })

  it('should accept array of string', () => {
    expect(() => {
      append("", ['foo', 'bar'])
    }).not.toThrow()
  })

  it('should not allow separator ":"', () => {
    expect(() => {
      append("", "invalid:header")
    }).toThrow(/field.*contains.*invalid/)
  })

  it('should not allow separator " "', () => {
    expect(() => {
      append("", "invalid header")
    }).toThrow(/field.*contains.*invalid/)
  })

  it.each(["\n", "\u0080"])("should not allow non-token character '%s'", (character: string) => {
    expect(() => {
      append("", `invalid${character}header`)
    }).toThrow(/field.*contains.*invalid/)
  })
})

describe('when header empty', () => {
  it('should set value', () => {
    expect(append('', 'Origin')).toBe('Origin')
  })

  it('should set value with array', () => {
    expect(append('', ['Origin', 'User-Agent'])).toBe('Origin, User-Agent')
  })

  it('should preserve case', () => {
    expect(append('', ['ORIGIN', 'user-agent', 'AccepT'])).toBe('ORIGIN, user-agent, AccepT')
  })
})

describe('when header has values', () => {
  it('should set value', () => {
    expect(append('Accept', 'Origin')).toBe('Accept, Origin')
  })

  it('should set value with array', () => {
    expect(append('Accept', ['Origin', 'User-Agent'])).toBe('Accept, Origin, User-Agent')
  })

  it('should not duplicate existing value', () => {
    expect(append('Accept', 'Accept')).toBe('Accept')
  })

  it('should compare case-insensitive', () => {
    expect(append('Accept', 'accEPT')).toBe('Accept')
  })

  it('should preserve case', () => {
    expect(append('Accept', 'AccepT')).toBe('Accept')
  })
})

describe('when *', () => {
  it('should set value', () => {
    expect(append('', '*')).toBe('*')
  })

  it('should act as if all values already set', () => {
    expect(append('*', 'Origin')).toBe('*')
  })

  it('should erradicate existing values', () => {
    expect(append('Accept, Accept-Encoding', '*')).toBe('*')
  })

  it('should update bad existing header', () => {
    expect(append('Accept, Accept-Encoding, *', 'Origin')).toBe('*')
  })
})

describe('when field is string', () => {
  it('should set value', () => {
    expect(append('', 'Accept')).toBe('Accept')
  })

  it('should set value when vary header', () => {
    expect(append('', 'Accept, Accept-Encoding')).toBe('Accept, Accept-Encoding')
  })

  it('should acept LWS', () => {
    expect(append('', '  Accept     ,     Origin    ')).toBe('Accept, Origin')
  })

  it('should handle contained *', () => {
    expect(append('', 'Accept,*')).toBe('*')
  })
})

describe('when field is array', () => {
  it('should set value', () => {
    expect(append('', ['Accept', 'Accept-Language'])).toBe('Accept, Accept-Language')
  })

  it('should ignore double-entries', () => {
    expect(append('', ['Accept', 'Accept'])).toBe('Accept')
  })

  it('should be case-insensitive', () => {
    expect(append('', ['Accept', 'ACCEPT'])).toBe('Accept')
  })

  it('should handle contained *', () => {
    expect(append('', ['Origin', 'User-Agent', '*', 'Accept'])).toBe('*')
  })

  it('should handle existing values', () => {
    expect(append('Accept, Accept-Encoding', ['origin', 'accept', 'accept-charset'])).toBe('Accept, Accept-Encoding, origin, accept-charset')
  })
})
