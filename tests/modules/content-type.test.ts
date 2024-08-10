import { describe, expect, it } from 'vitest'

import * as contentType from '@/packages/content-type/src/index'

describe('format', () => {
  it('should format basic type', () => {
    const str = contentType.format({ type: 'text/html' })
    expect(str).toEqual('text/html')
  })

  it('should format type with suffix', () => {
    const str = contentType.format({ type: 'image/svg+xml' })
    expect(str).toBe('image/svg+xml')
  })

  it('should format type with parameter', () => {
    const str = contentType.format({
      type: 'text/html',
      parameters: { charset: 'utf-8' }
    })
    expect(str).toBe('text/html; charset=utf-8')
  })

  it('should format type with parameter that needs quotes', () => {
    const str = contentType.format({
      type: 'text/html',
      parameters: { foo: 'bar or "baz"' }
    })
    expect(str).toBe('text/html; foo="bar or \\"baz\\""')
  })

  it('should format type with parameter with empty value', () => {
    const str = contentType.format({
      type: 'text/html',
      parameters: { foo: '' }
    })
    expect(str).toBe('text/html; foo=""')
  })

  it('should format type with multiple parameters', () => {
    const str = contentType.format({
      type: 'text/html',
      parameters: { charset: 'utf-8', foo: 'bar', bar: 'baz' }
    })
    expect(str).toBe('text/html; bar=baz; charset=utf-8; foo=bar')
  })

  it('should require argument', () => {
    expect(() => {
      contentType.format(undefined as any)
    }).toThrow(/argument obj is required/)
  })

  it('should reject non-objects', () => {
    expect(() => {
      contentType.format(7 as any)
    }).toThrow(/argument obj is required/)
  })

  it('should require type', () => {
    expect(() => {
      contentType.format({} as any)
    }).toThrow(/invalid type/)
  })

  it('should reject invalid type', () => {
    expect(() => {
      contentType.format({ type: 'text/' } as any)
    }).toThrow(/invalid type/)
  })

  it('should reject invalid type with LWS', () => {
    expect(() => {
      contentType.format({ type: ' text/html' } as any)
    }).toThrow(/invalid type/)
  })

  it('should reject invalid parameter name', () => {
    expect(() => {
      contentType.format({ type: 'image/svg', parameters: { 'foo/': 'bar' } })
    }).toThrow(/invalid parameter name/)
  })

  it('should reject invalid parameter value', () => {
    expect(() => {
      contentType.format({ type: 'image/svg', parameters: { foo: 'bar\u0000' } })
    }).toThrow(/invalid parameter value/)
  })
})

describe('parse', () => {
  describe('contentType.parse(string)', () => {
    it('should parse basic type', () => {
      const type = contentType.parse('text/html')
      expect(type.type).toBe('text/html')
    })

    it('should parse with suffix', () => {
      const type = contentType.parse('image/svg+xml')
      expect(type.type).toBe('image/svg+xml')
    })

    it('should parse basic type with surrounding OWS', () => {
      const type = contentType.parse(' text/html ')
      expect(type.type).toBe('text/html')
    })

    it('should parse parameters', () => {
      const type = contentType.parse('text/html; charset=utf-8; foo=bar')
      expect(type.type).toBe('text/html')

      expect(type.parameters).toEqual({
        charset: 'utf-8',
        foo: 'bar'
      })
    })

    it('should parse parameters with extra LWS', () => {
      const type = contentType.parse('text/html ; charset=utf-8 ; foo=bar')
      expect(type.type).toBe('text/html')

      expect(type.parameters).toEqual({
        charset: 'utf-8',
        foo: 'bar'
      })
    })

    it('should lower-case type', () => {
      const type = contentType.parse('IMAGE/SVG+XML')
      expect(type.type).toBe('image/svg+xml')
    })

    it('should lower-case parameter names', () => {
      const type = contentType.parse('text/html; Charset=UTF-8')
      expect(type.type).toBe('text/html')

      expect(type.parameters).toEqual({
        charset: 'UTF-8'
      })
    })

    it('should unquote parameter values', () => {
      const type = contentType.parse('text/html; charset="UTF-8"')
      expect(type.type).toBe('text/html')

      expect(type.parameters).toEqual({
        charset: 'UTF-8'
      })
    })

    it('should unquote parameter values with escapes', () => {
      const type = contentType.parse('text/html; charset = "UT\\F-\\\\\\"8\\""')
      expect(type.type).toBe('text/html')

      expect(type.parameters).toEqual({
        charset: 'UTF-\\"8"'
      })
    })

    it('should handle balanced quotes', () => {
      const type = contentType.parse('text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo')
      expect(type.type).toBe('text/html')

      expect(type.parameters).toEqual({
        param: 'charset="utf-8"; foo=bar',
        bar: 'foo'
      })
    })

    const invalidTypes = [
      ' ',
      'null',
      'undefined',
      '/',
      'text / plain',
      'text/;plain',
      'text/"plain"',
      'text/p£ain',
      'text/(plain)',
      'text/@plain',
      'text/plain,wrong'
    ]

    describe.each(invalidTypes)("'invalid media type '%s'", (type: string) => {
      it(`should throw on invalid media type '${type}'`, () => {
        expect(() => {
          contentType.parse(type)
        }).toThrow(/invalid media type/)
      })
    })

    const incorrectlyFormattedTypes = [
      'text/plain; foo="bar',
      'text/plain; profile=http://localhost; foo=bar',
      'text/plain; profile=http://localhost'
    ]

    it.each(incorrectlyFormattedTypes)("should throw on invalid parameter format '%s'", (type: string) => {
      expect(() => {
        contentType.parse(type)
      }).toThrow(/invalid parameter format/)
    })

    it('should require argument', () => {
      expect(() => {
        contentType.parse(undefined as any)
      }).toThrow(/string.*required/)
    })

    it('should reject non-strings', () => {
      expect(() => {
        contentType.parse(7 as any)
      }).toThrow(/string.*required/)
    })
  })

  describe('contentType.parse(req)', () => {
    it('should parse content-type header', () => {
      const req = { headers: { 'content-type': 'text/html' } }
      const type = contentType.parse(req)
      expect(type.type).toBe('text/html')
    })

    it('should reject objects without either `headers` or `getHeaders` property', () => {
      expect(() => {
        contentType.parse({} as any)
      }).toThrow(/content-type header is missing/)
    })

    describe('with `headers` property', () => {
      it('should reject missing content-type', () => {
        expect(() => {
          contentType.parse({ headers: {} } as any)
        }).toThrow(/content-type header is missing/)
      })

      it('should parse content-type header', () => {
        const res = {
          headers: { 'content-type': 'text/html' }
        }
        const type = contentType.parse(res)
        expect(type.type).toBe('text/html')
      })
    })

    describe('with `getHeaders` property', () => {
      it('should reject missing content-type', () => {
        expect(() => {
          contentType.parse({ getHeader: () => {} } as any)
        }).toThrow(/content-type header is missing/)
      })

      it('should parse content-type header', () => {
        const res = {
          getHeader: () => {
            return 'text/html'
          }
        }
        const type = contentType.parse(res)
        expect(type.type).toBe('text/html')
      })
    })
  })
})
