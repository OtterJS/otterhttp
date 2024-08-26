import fs from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import * as dotenv from "@/packages/dotenv/src"

vi.mock<typeof fs>(import("node:fs"), async (importOriginal) => {
  const module = await importOriginal()

  const modifiedModule = {
    ...module,
    readFileSync: vi.fn(module.readFileSync),
  } satisfies typeof fs

  return {
    ...modifiedModule,
    default: modifiedModule,
  }
})

const envPath = path.resolve(import.meta.dirname, "..", "fixtures", ".env")

const envFile = fs.readFileSync(envPath, { encoding: "utf8" })

const parsed = dotenv.parse(envFile)

const mockParseResponse = { test: "foo" }

const expectedPayload = { SERVER: "localhost", PASSWORD: "password", DB: "tests" }

afterEach(() => vi.restoreAllMocks())

describe("Dotenv parsing", () => {
  it("sets basic environment variable", () => {
    expect(parsed.BASIC).toBe("basic")
  })
  it("reads after a skipped line", () => {
    expect(parsed.AFTER_LINE).toBe("after_line")
  })
  it("defaults empty values to empty string", () => {
    expect(parsed.EMPTY).toBe("")
  })
  it("escapes single quoted values", () => {
    expect(parsed.SINGLE_QUOTES).toBe("single_quotes")
  })
  it("respects surrounding spaces in single quotes", () => {
    expect(parsed.SINGLE_QUOTES_SPACED).toBe("    single quotes    ")
  })
  it("escapes double quoted values", () => {
    expect(parsed.DOUBLE_QUOTES).toBe("double_quotes")
  })
  it("respects surrounding spaces in double quotes", () => {
    expect(parsed.DOUBLE_QUOTES_SPACED).toBe("    double quotes    ")
  })
  it("expands newlines but only if double quoted", () => {
    expect(parsed.EXPAND_NEWLINES).toBe("expand\nnew\nlines")
  })
  it("expands newlines but only if double quoted", () => {
    expect(parsed.DONT_EXPAND_UNQUOTED).toBe("dontexpand\\nnewlines")
  })
  it("should parse a buffer into an object", () => {
    const payload = dotenv.parse(Buffer.from("BUFFER=true"))
    expect(payload.BUFFER).toBe("true")
  })
  it("can parse (\\r) line endings", () => {
    const payload = dotenv.parse(Buffer.from("SERVER=localhost\rPASSWORD=password\rDB=tests\r"))

    expect(payload).toEqual(expectedPayload)
  })
  it("can parse (\\n) line endings", () => {
    const payload = dotenv.parse(Buffer.from("SERVER=localhost\nPASSWORD=password\nDB=tests\n"))

    expect(payload).toEqual(expectedPayload)
  })
  it("can parse (\\r\\n) line endings", () => {
    const payload = dotenv.parse(Buffer.from("SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n"))

    expect(payload).toEqual(expectedPayload)
  })
  it("debug works", () => {
    const log = console.log

    console.log = (x: unknown) => {
      expect(x).toBe("[dotenv][DEBUG] did not match key and value when parsing line 1: what is this")
    }

    dotenv.parse(Buffer.from("what is this"), { debug: true })

    console.log = log
  })
})

describe("Dotenv config", () => {
  afterEach(() => {
    process.env = {}
  })
  describe("options", () => {
    it("takes path as option", () => {
      const { parsed } = dotenv.config({ path: envPath })
      expect(parsed).toMatchObject({ BASIC: "basic" })
    })
    it("takes encoding as option", () => {
      const encoding = "latin1"

      vi.mocked(fs.readFileSync).mockImplementation((_: unknown, options: Parameters<typeof fs.readFileSync>[1]) => {
        expect(options).toMatchObject({ encoding })
      })

      dotenv.config({ encoding })
      expect(fs.readFileSync).toHaveBeenCalled()
    })
  })

  it("reads path with encoding, parsing output to process.env", () => {
    const { parsed } = dotenv.config({ path: envPath })

    expect(parsed).toMatchObject(mockParseResponse)
  })

  it("does not write over keys already in process.env", () => {
    const existing = "bar"
    process.env.test = existing
    const env = dotenv.config({ path: envPath })

    expect(env.parsed).toMatchObject(mockParseResponse)
    expect(process.env.test).toBe(existing)
  })

  it("does not write over keys already in process.env if the key has a falsy value", () => {
    const existing = ""
    process.env.test = existing
    const env = dotenv.config({ path: envPath, debug: true })

    expect(env.parsed).toMatchObject(mockParseResponse)
    expect(process.env.test).toBe(existing)
  })
})
