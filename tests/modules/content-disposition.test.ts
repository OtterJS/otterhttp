import { describe, expect, it, onTestFinished, vi } from "vitest"

import { ContentDisposition, contentDisposition, parse } from "@/packages/content-disposition/src"

describe("contentDisposition()", () => {
  it("should create an attachment header", () => {
    expect(contentDisposition()).toBe("attachment")
  })
})

describe("contentDisposition(filename)", () => {
  it("should create a header with file name", () => {
    expect(contentDisposition("plans.pdf")).toBe("attachment; filename=plans.pdf")
  })

  it("should use the basename of the string", () => {
    expect(contentDisposition("/path/to/plans.pdf")).toBe("attachment; filename=plans.pdf")
  })
  it("should throw an error when non latin fallback is used", () => {
    expect(() => {
      contentDisposition("index.ht", { type: "html", fallback: "ÇŞ" })
    }).toThrow("fallback must be ISO-8859-1 string")
  })
  it("should use hasfallback", () => {
    expect(contentDisposition("index.ht", { type: "html", fallback: "html" })).toEqual(
      `html; filename*=utf-8''index.ht; filename=html`,
    )
  })
  it("should use pencode fn", () => {
    expect(contentDisposition("inde(x.ht", { type: "html", fallback: "html" })).toEqual(
      `html; filename*=utf-8\'\'inde%28x.ht; filename=html`,
    )
  })
  it("should use fallback when file ext is non ascii", () => {
    expect(contentDisposition("index.ĄÇḐȨĢ", { type: "html", fallback: "html" })).toEqual(
      `html; filename*=utf-8\'\'index.%C4%84%C3%87%E1%B8%90%C8%A8%C4%A2; filename=html`,
    )
  })
  it("should throw an error when non string options.type is used", () => {
    expect(() => {
      contentDisposition("index.ht", { type: { test: "test" } as unknown as string })
    }).toThrow("invalid type")
  })
  describe('when "filename" is US-ASCII', () => {
    it("should only include filename parameter", () => {
      expect(contentDisposition("plans.pdf")).toBe("attachment; filename=plans.pdf")
    })

    it("should escape quotes", () => {
      expect(contentDisposition('the "plans".pdf')).toBe('attachment; filename="the \\"plans\\".pdf"')
    })
  })
})

describe("parse(string)", () => {
  describe("with type", () => {
    it("should throw on quoted value", () => {
      expect(() => {
        parse('"attachment"')
      }).toThrow("invalid type format")
    })
    it("should not throw on trailing semi", () => {
      expect(() => {
        parse("attachment;")
      }).not.toThrow()
    })
    it('should parse "attachment"', () => {
      expect(parse("attachment")).toStrictEqual(new ContentDisposition("attachment", {}))
    })
    it('should parse "inline"', () => {
      expect(parse("inline")).toStrictEqual(new ContentDisposition("inline", {}))
    })
    it('should parse "form-data"', () => {
      expect(parse("form-data")).toStrictEqual(new ContentDisposition("form-data", {}))
    })
    it("should throw with trailing LWS", () => {
      expect(() => {
        parse("attachment \t ")
      }).toThrow()
    })
    it("should normalize to lower-case", () => {
      expect(parse("ATTACHMENT")).toStrictEqual(new ContentDisposition("attachment", {}))
    })
  })
  describe("with parameters", () => {
    it("should not throw on trailing semi", () => {
      expect(() => {
        parse('attachment; filename="rates.pdf";')
      }).not.toThrow()
    })
    it("should throw on invalid param name", () => {
      expect(() => {
        parse('attachment; filename@="rates.pdf"')
      }).toThrow("invalid parameter format")
    })
    it("should throw on missing param value", () => {
      expect(() => {
        parse("attachment; filename=")
      }).toThrow("invalid parameter format")
    })

    it("should reject invalid parameter value", () => {
      expect(() => {
        parse("attachment; filename=trolly,trains")
      }).toThrow(/invalid parameter format/)
    })

    it("should reject invalid parameters", () => {
      expect(() => {
        parse("attachment; filename=total/; foo=bar")
      }).toThrow(/invalid parameter format/)
    })

    it("should reject duplicate parameters", () => {
      expect(() => {
        parse("attachment; filename=foo; filename=bar")
      }).toThrow(/duplicate parameter/)
    })

    it.each(['filename="plans.pdf"', '; filename="plans.pdf"'])("should reject missing type", (value: string) => {
      expect(() => {
        parse(value)
      }).toThrow(/invalid type format/)
    })

    it("should lower-case parameter name", () => {
      expect(parse('attachment; FILENAME="plans.pdf"')).toStrictEqual(
        new ContentDisposition("attachment", { filename: "plans.pdf" }),
      )
    })

    it("should parse quoted parameter value", () => {
      expect(parse('attachment; filename="plans.pdf"')).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf" },
      })
    })

    it("should parse & unescape quoted value", () => {
      expect(parse('attachment; filename="the \\"plans\\".pdf"')).toEqual({
        type: "attachment",
        parameters: { filename: 'the "plans".pdf' },
      })
    })

    it("should include all parameters", () => {
      expect(parse('attachment; filename="plans.pdf"; foo=bar')).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf", foo: "bar" },
      })
    })

    it("should parse parameters separated with any LWS", () => {
      expect(parse('attachment;filename="plans.pdf" \t;    \t\t foo=bar')).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf", foo: "bar" },
      })
    })

    it("should parse token filename", () => {
      expect(parse("attachment; filename=plans.pdf")).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf" },
      })
    })

    it("should parse ISO-8859-1 filename", () => {
      expect(parse('attachment; filename="£ rates.pdf"')).toEqual({
        type: "attachment",
        parameters: { filename: "£ rates.pdf" },
      })
    })
    it("should throw error if decodeURI throws an error", () => {
      onTestFinished(() => vi.unstubAllGlobals())
      vi.stubGlobal("decodeURIComponent", (encodedURIComponent: string) => {
        throw encodedURIComponent
      })
      expect(() => {
        parse("attachment; filename*=UTF-8'en'%E2%82%AC%20rates.pdf")
      }).toThrow()
    })
  })
  describe("with extended parameters", () => {
    it("should reject quoted extended parameter value", () => {
      expect(() => {
        parse("attachment; filename*=\"UTF-8''%E2%82%AC%20rates.pdf\"")
      }).toThrow(/invalid extended.*value/)
    })

    it("should parse UTF-8 extended parameter value", () => {
      expect(parse("attachment; filename*=UTF-8''%E2%82%AC%20rates.pdf")).toEqual({
        type: "attachment",
        parameters: { "filename*": "€ rates.pdf" },
      })
    })

    it("should parse ISO-8859-1 extended parameter value", () => {
      expect(parse("attachment; filename*=ISO-8859-1''%A3%20rates.pdf")).toEqual({
        type: "attachment",
        parameters: { "filename*": "£ rates.pdf" },
      })
      expect(parse("attachment; filename*=ISO-8859-1''%82%20rates.pdf")).toEqual({
        type: "attachment",
        parameters: { "filename*": "? rates.pdf" },
      })
    })

    it("should not be case-sensitive for charser", () => {
      expect(parse("attachment; filename*=utf-8''%E2%82%AC%20rates.pdf")).toEqual({
        type: "attachment",
        parameters: { "filename*": "€ rates.pdf" },
      })
    })

    it("should reject unsupported charset", () => {
      expect(() => {
        parse("attachment; filename*=ISO-8859-2''%A4%20rates.pdf")
      }).toThrow(/unsupported charset/)
    })

    it("should parse with embedded language", () => {
      expect(parse("attachment; filename*=UTF-8'en'%E2%82%AC%20rates.pdf")).toEqual({
        type: "attachment",
        parameters: { "filename*": "€ rates.pdf" },
      })
    })

    it("should keep both extended and fallback parameter value", () => {
      expect(parse("attachment; filename=\"EURO rates.pdf\"; filename*=UTF-8''%E2%82%AC%20rates.pdf")).toEqual({
        type: "attachment",
        parameters: { "filename*": "€ rates.pdf", filename: "EURO rates.pdf" },
      })
      expect(parse("attachment; filename*=UTF-8''%E2%82%AC%20rates.pdf; filename=\"EURO rates.pdf\"")).toEqual({
        type: "attachment",
        parameters: { "filename*": "€ rates.pdf", filename: "EURO rates.pdf" },
      })
    })
  })
  describe("from TC 2231", () => {
    describe("Disposition-Type Inline", () => {
      it('should parse "inline"', () => {
        expect(parse("inline")).toEqual({
          type: "inline",
          parameters: {},
        })
      })

      it('should reject ""inline""', () => {
        expect(() => {
          parse('"inline"')
        }).toThrow(/invalid type format/)
      })

      it('should parse "inline; filename="foo.html""', () => {
        expect(parse('inline; filename="foo.html"')).toEqual({
          type: "inline",
          parameters: { filename: "foo.html" },
        })
      })

      it('should parse "inline; filename="Not an attachment!""', () => {
        expect(parse('inline; filename="Not an attachment!"')).toEqual({
          type: "inline",
          parameters: { filename: "Not an attachment!" },
        })
      })

      it('should parse "inline; filename="foo.pdf""', () => {
        expect(parse('inline; filename="foo.pdf"')).toEqual({
          type: "inline",
          parameters: { filename: "foo.pdf" },
        })
      })
    })
    describe("Disposition-Type Attachment", () => {
      it('should parse "attachment"', () => {
        expect(parse("attachment")).toEqual({
          type: "attachment",
          parameters: {},
        })
      })

      it('should reject ""attachment""', () => {
        expect(() => {
          parse('"attachment')
        }).toThrow(/invalid type format/)
      })

      it('should parse "ATTACHMENT"', () => {
        expect(parse("ATTACHMENT")).toEqual({
          type: "attachment",
          parameters: {},
        })
      })

      it('should parse "attachment; filename="foo.html""', () => {
        expect(parse('attachment; filename="foo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        })
      })

      it('should parse "attachment; filename="0000000000111111111122222""', () => {
        expect(parse('attachment; filename="0000000000111111111122222"')).toEqual({
          type: "attachment",
          parameters: { filename: "0000000000111111111122222" },
        })
      })

      it('should parse "attachment; filename="00000000001111111111222222222233333""', () => {
        expect(parse('attachment; filename="00000000001111111111222222222233333"')).toEqual({
          type: "attachment",
          parameters: { filename: "00000000001111111111222222222233333" },
        })
      })

      it('should parse "attachment; filename="f\\oo.html""', () => {
        expect(parse('attachment; filename="f\\oo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        })
      })

      it('should parse "attachment; filename="\\"quoting\\" tested.html""', () => {
        expect(parse('attachment; filename="\\"quoting\\" tested.html"')).toEqual({
          type: "attachment",
          parameters: { filename: '"quoting" tested.html' },
        })
      })

      it('should parse "attachment; filename="Here\'s a semicolon;.html""', () => {
        expect(parse('attachment; filename="Here\'s a semicolon;.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "Here's a semicolon;.html" },
        })
      })

      it('should parse "attachment; foo="bar"; filename="foo.html""', () => {
        expect(parse('attachment; foo="bar"; filename="foo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html", foo: "bar" },
        })
      })

      it('should parse "attachment; foo="\\"\\\\";filename="foo.html""', () => {
        expect(parse('attachment; foo="\\"\\\\";filename="foo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html", foo: '"\\' },
        })
      })

      it('should parse "attachment; FILENAME="foo.html""', () => {
        expect(parse('attachment; FILENAME="foo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        })
      })

      it('should parse "attachment; filename=foo.html"', () => {
        expect(parse("attachment; filename=foo.html")).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        })
      })

      it('should reject "attachment; filename=foo,bar.html"', () => {
        expect(() => {
          parse("attachment; filename=foo,bar.html")
        }).toThrow(/invalid parameter format/)
      })

      it('should accept "attachment; filename=foo.html ;"', () => {
        expect(() => {
          parse("attachment; filename=foo.html ;")
        }).not.toThrow()
      })

      it('should accept "attachment; ;filename=foo"', () => {
        expect(() => {
          parse("attachment; ;filename=foo")
        }).not.toThrow()
      })

      it('should reject "attachment; filename=foo bar.html"', () => {
        expect(() => {
          parse("attachment; filename=foo bar.html")
        }).toThrow(/invalid parameter format/)
      })

      it("should parse \"attachment; filename='foo.bar'", () => {
        expect(parse("attachment; filename='foo.bar'")).toEqual({
          type: "attachment",
          parameters: { filename: "'foo.bar'" },
        })
      })

      it('should parse "attachment; filename="foo-ä.html""', () => {
        expect(parse('attachment; filename="foo-ä.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        })
      })

      it('should parse "attachment; filename="foo-Ã¤.html""', () => {
        expect(parse('attachment; filename="foo-Ã¤.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo-Ã¤.html" },
        })
      })

      it('should parse "attachment; filename="foo-%41.html""', () => {
        expect(parse('attachment; filename="foo-%41.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo-%41.html" },
        })
      })

      it('should parse "attachment; filename="50%.html""', () => {
        expect(parse('attachment; filename="50%.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "50%.html" },
        })
      })

      it('should parse "attachment; filename="foo-%\\41.html""', () => {
        expect(parse('attachment; filename="foo-%\\41.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo-%41.html" },
        })
      })

      it('should parse "attachment; name="foo-%41.html""', () => {
        expect(parse('attachment; name="foo-%41.html"')).toEqual({
          type: "attachment",
          parameters: { name: "foo-%41.html" },
        })
      })

      it('should parse "attachment; filename="ä-%41.html""', () => {
        expect(parse('attachment; filename="ä-%41.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "ä-%41.html" },
        })
      })

      it('should parse "attachment; filename="foo-%c3%a4-%e2%82%ac.html""', () => {
        expect(parse('attachment; filename="foo-%c3%a4-%e2%82%ac.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "foo-%c3%a4-%e2%82%ac.html" },
        })
      })

      it('should reject "attachment; filename ="foo.html""', () => {
        expect(() => parse('attachment; filename ="foo.html"')).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename="foo.html"; filename="bar.html"', () => {
        expect(parse.bind(null, 'attachment; filename="foo.html"; filename="bar.html"')).toThrow(/duplicate parameter/)
      })

      it('should reject "attachment; filename=foo[1](2).html"', () => {
        expect(parse.bind(null, "attachment; filename=foo[1](2).html")).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename=foo-ä.html"', () => {
        expect(parse.bind(null, "attachment; filename=foo-ä.html")).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename=foo-Ã¤.html"', () => {
        expect(parse.bind(null, "attachment; filename=foo-Ã¤.html")).toThrow(/invalid parameter format/)
      })

      it('should reject "filename=foo.html"', () => {
        expect(parse.bind(null, "filename=foo.html")).toThrow(/invalid type format/)
      })

      it('should reject "x=y; filename=foo.html"', () => {
        expect(parse.bind(null, "x=y; filename=foo.html")).toThrow(/invalid type format/)
      })

      it('should reject ""foo; filename=bar;baz"; filename=qux"', () => {
        expect(parse.bind(null, '"foo; filename=bar;baz"; filename=qux')).toThrow(/invalid type format/)
      })

      it('should reject "filename=foo.html, filename=bar.html"', () => {
        expect(parse.bind(null, "filename=foo.html, filename=bar.html")).toThrow(/invalid type format/)
      })

      it('should reject "; filename=foo.html"', () => {
        expect(parse.bind(null, "; filename=foo.html")).toThrow(/invalid type format/)
      })

      it('should reject ": inline; attachment; filename=foo.html', () => {
        expect(parse.bind(null, ": inline; attachment; filename=foo.html")).toThrow(/invalid type format/)
      })

      it('should reject "inline; attachment; filename=foo.html', () => {
        expect(parse.bind(null, "inline; attachment; filename=foo.html")).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; inline; filename=foo.html', () => {
        expect(parse.bind(null, "attachment; inline; filename=foo.html")).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename="foo.html".txt', () => {
        expect(parse.bind(null, 'attachment; filename="foo.html".txt')).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename="bar', () => {
        expect(parse.bind(null, 'attachment; filename="bar')).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename=foo"bar;baz"qux', () => {
        expect(parse.bind(null, 'attachment; filename=foo"bar;baz"qux')).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename=foo.html, attachment; filename=bar.html', () => {
        expect(parse.bind(null, "attachment; filename=foo.html, attachment; filename=bar.html")).toThrow(
          /invalid parameter format/,
        )
      })

      it('should reject "attachment; foo=foo filename=bar', () => {
        expect(parse.bind(null, "attachment; foo=foo filename=bar")).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment; filename=bar foo=foo', () => {
        expect(parse.bind(null, "attachment; filename=bar foo=foo")).toThrow(/invalid parameter format/)
      })

      it('should reject "attachment filename=bar', () => {
        expect(parse.bind(null, "attachment filename=bar")).toThrow(/invalid type format/)
      })

      it('should reject "filename=foo.html; attachment', () => {
        expect(parse.bind(null, "filename=foo.html; attachment")).toThrow(/invalid type format/)
      })

      it('should parse "attachment; xfilename=foo.html"', () => {
        expect(parse("attachment; xfilename=foo.html")).toEqual({
          type: "attachment",
          parameters: { xfilename: "foo.html" },
        })
      })

      it('should parse "attachment; filename="/foo.html""', () => {
        expect(parse('attachment; filename="/foo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "/foo.html" },
        })
      })

      it('should parse "attachment; filename="\\\\foo.html""', () => {
        expect(parse('attachment; filename="\\\\foo.html"')).toEqual({
          type: "attachment",
          parameters: { filename: "\\foo.html" },
        })
      })
    })
  })
})
