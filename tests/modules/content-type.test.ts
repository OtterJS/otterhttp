import { describe, expect, it } from "vitest"

import * as contentType from "@/packages/content-type/src"
import { isPlainText, parse } from "@/packages/content-type/src"

describe("format", () => {
  it("should format basic type", () => {
    const str = contentType.format({ type: "text", subtype: "html" })
    expect(str).toEqual("text/html")
  })

  it("should format type with suffix", () => {
    const str = contentType.format({ type: "image", subtype: "svg+xml" })
    expect(str).toBe("image/svg+xml")
  })

  it("should format type with parameter", () => {
    const str = contentType.format({
      type: "text",
      subtype: "html",
      parameters: { charset: "utf-8" },
    })
    expect(str).toBe("text/html; charset=utf-8")
  })

  it("should format type with parameter that needs quotes", () => {
    const str = contentType.format({
      type: "text",
      subtype: "html",
      parameters: { foo: 'bar or "baz"' },
    })
    expect(str).toBe('text/html; foo="bar or \\"baz\\""')
  })

  it("should format type with parameter with empty value", () => {
    const str = contentType.format({
      type: "text",
      subtype: "html",
      parameters: { foo: "" },
    })
    expect(str).toBe('text/html; foo=""')
  })

  it("should format type with multiple parameters", () => {
    const str = contentType.format({
      type: "text",
      subtype: "html",
      parameters: { charset: "utf-8", foo: "bar", bar: "baz" },
    })
    expect(str).toBe("text/html; bar=baz; charset=utf-8; foo=bar")
  })

  it("should require argument", () => {
    expect(() => {
      contentType.format(undefined as any)
    }).toThrow(/argument obj is required/)
  })

  it("should reject non-objects", () => {
    expect(() => {
      contentType.format(7 as any)
    }).toThrow(/argument obj is required/)
  })

  it("should require type", () => {
    expect(() => {
      contentType.format({} as any)
    }).toThrow(/invalid type/)
  })

  it("should reject invalid type", () => {
    expect(() => {
      contentType.format({ type: "text/", subtype: "" })
    }).toThrow(/invalid type/)
  })

  it("should reject invalid type with LWS", () => {
    expect(() => {
      contentType.format({ type: " text", subtype: "html" })
    }).toThrow(/invalid type/)
  })

  it("should reject invalid parameter name", () => {
    expect(() => {
      contentType.format({ type: "image", subtype: "svg", parameters: { "foo/": "bar" } })
    }).toThrow(/invalid parameter name/)
  })

  it("should reject invalid parameter value", () => {
    expect(() => {
      contentType.format({ type: "image", subtype: "svg", parameters: { foo: "bar\u0000" } })
    }).toThrow(/invalid parameter value/)
  })
})

describe("parse", () => {
  describe("contentType.parse(string)", () => {
    it("should parse basic type", () => {
      const type = contentType.parse("text/html")
      expect(type).toMatchObject({ type: "text", subtype: "html" })
    })

    it("should parse with suffix", () => {
      const type = contentType.parse("image/svg+xml")
      expect(type).toMatchObject({ type: "image", subtype: "svg+xml" })
    })

    it("should parse basic type with surrounding OWS", () => {
      const type = contentType.parse(" text/html ")
      expect(type).toMatchObject({ type: "text", subtype: "html" })
    })

    it("should parse parameters", () => {
      const type = contentType.parse("text/html; charset=utf-8; foo=bar")
      expect(type).toMatchObject({
        type: "text",
        subtype: "html",
        parameters: {
          charset: "utf-8",
          foo: "bar",
        },
      })
    })

    it("should parse parameters with extra LWS", () => {
      const type = contentType.parse("text/html ; charset=utf-8 ; foo=bar")
      expect(type).toMatchObject({
        type: "text",
        subtype: "html",
        parameters: {
          charset: "utf-8",
          foo: "bar",
        },
      })
    })

    it("should lower-case type", () => {
      const type = contentType.parse("IMAGE/SVG+XML")
      expect(type).toMatchObject({ type: "image", subtype: "svg+xml" })
    })

    it("should lower-case parameter names", () => {
      const type = contentType.parse("text/html; Charset=UTF-8")
      expect(type).toMatchObject({
        type: "text",
        subtype: "html",
        parameters: {
          charset: "UTF-8",
        },
      })
    })

    it("should unquote parameter values", () => {
      const type = contentType.parse('text/html; charset="UTF-8"')
      expect(type).toMatchObject({
        type: "text",
        subtype: "html",
        parameters: {
          charset: "UTF-8",
        },
      })
    })

    it("should unquote parameter values with escapes", () => {
      const type = contentType.parse('text/html; charset="UT\\F-\\\\\\"8\\""')
      expect(type).toMatchObject({
        type: "text",
        subtype: "html",
        parameters: {
          charset: 'UTF-\\"8"',
        },
      })
    })

    it("should handle balanced quotes", () => {
      const type = contentType.parse('text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo')
      expect(type).toMatchObject({
        type: "text",
        subtype: "html",
        parameters: {
          param: 'charset="utf-8"; foo=bar',
          bar: "foo",
        },
      })
    })

    const invalidTypes = [
      " ",
      "null",
      "undefined",
      "/",
      "text / plain",
      "text/;plain",
      'text/"plain"',
      "text/p£ain",
      "text/(plain)",
      "text/@plain",
      "text/plain,wrong",
      "text/+plain",
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
      "text/plain; profile=http://localhost; foo=bar",
      "text/plain; profile=http://localhost",
      "text/plain; charset =utf-8",
      "text/plain; charset= utf-8",
    ]

    it.each(incorrectlyFormattedTypes)("should throw on invalid parameter format '%s'", (type: string) => {
      expect(() => {
        contentType.parse(type)
      }).toThrow(/invalid parameter format/)
    })

    it("should require argument", () => {
      expect(() => {
        contentType.parse(undefined as any)
      }).toThrow(/argument.*is required/)
    })

    it("should reject non-strings", () => {
      expect(() => {
        contentType.parse(7 as any)
      }).toThrow(/argument.*must be string/)
    })
  })

  describe("contentType.parse(req)", () => {
    it("should parse content-type header", () => {
      const req = { headers: { "content-type": "text/html" } }
      const type = contentType.parse(req)
      expect(type).toMatchObject({ type: "text", subtype: "html" })
    })

    it("should reject objects without either `headers` or `getHeaders` property", () => {
      expect(() => {
        contentType.parse({} as any)
      }).toThrow(/content-type header is missing/)
    })

    describe("with `headers` property", () => {
      it("should reject missing content-type", () => {
        expect(() => {
          contentType.parse({ headers: {} } as any)
        }).toThrow(/content-type header is missing/)
      })

      it("should parse content-type header", () => {
        const res = {
          headers: { "content-type": "text/html" },
        }
        const type = contentType.parse(res)
        expect(type).toMatchObject({ type: "text", subtype: "html" })
      })
    })

    describe("with `getHeaders` property", () => {
      it("should reject missing content-type", () => {
        expect(() => {
          contentType.parse({ getHeader: () => {} } as any)
        }).toThrow(/content-type header is missing/)
      })

      it("should parse content-type header", () => {
        const res = {
          getHeader: () => {
            return "text/html"
          },
        }
        const type = contentType.parse(res)
        expect(type).toMatchObject({ type: "text", subtype: "html" })
      })
    })
  })
})

describe("isPlainText(contentType)", () => {
  describe("with text/ types", () => {
    it.each([
      "text/markdown",
      "text/plain",
      "text/subformat+plain",
      "text/html",
      "text/tsx",
      "text/typescript",
      "text/jsx",
    ])("should match '%s'", (value: string) => {
      const type = parse(value)
      expect(isPlainText(type)).toBe(true)
    })
  })

  describe("with application/ types", () => {
    it.each([
      "application/ecmascript",
      "application/javascript",
      "application/json",
      "application/subformat+json",
      "application/xml",
      "application/rdf+xml",
      "application/x-httpd-php",
      "application/x-sh",
      "application/node",
    ])("should match '%s'", (value: string) => {
      const type = parse(value)
      expect(isPlainText(type)).toBe(true)
    })

    it.each(["application/hypotheticalxml", "application/pdf", "application/octet-stream", "application/zip"])(
      "should not match '%s'",
      (value: string) => {
        const type = parse(value)
        expect(isPlainText(type)).toBe(false)
      },
    )
  })

  describe("with other types", () => {
    it.each(["audio/mp3", "video/mp4", "image/webp", "font/otf", "audio/json", "audio/subtype+json"])(
      "should not match '%s'",
      (value: string) => {
        const type = parse(value)
        expect(isPlainText(type)).toBe(false)
      },
    )
  })
})
