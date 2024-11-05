import type { IncomingMessage } from "node:http"
import { describe, expect, it } from "vitest"

import { forwarded } from "@/packages/forwarded/src"
import { createReq } from "@/test_helpers/createReq"
import { ip } from "@/test_helpers/ip-tagged-template"

describe("forwarded(req)", () => {
  it("should work with `X-Forwarded-For` header", () => {
    const req = createReq("127.0.0.1") as IncomingMessage

    expect(Array.from(forwarded(req))).toStrictEqual([ip`127.0.0.1`])
  })
  it("should include entries from `X-Forwarded-For`", () => {
    const req = createReq("127.0.0.1", {
      "x-forwarded-for": "10.0.0.2, 10.0.0.1",
    }) as IncomingMessage

    expect(Array.from(forwarded(req))).toStrictEqual([ip`127.0.0.1`, ip`10.0.0.1`, ip`10.0.0.2`])
  })
  it("should skip blank entries", () => {
    const req = createReq("127.0.0.1", {
      "x-forwarded-for": "10.0.0.2,, 10.0.0.1",
    }) as IncomingMessage

    expect(Array.from(forwarded(req))).toStrictEqual([ip`127.0.0.1`, ip`10.0.0.1`, ip`10.0.0.2`])
  })
  it("should trim leading OWS", () => {
    const req = createReq("127.0.0.1", {
      "x-forwarded-for": " 10.0.0.2 ,  , 10.0.0.1 ",
    }) as IncomingMessage

    expect(Array.from(forwarded(req))).toStrictEqual([ip`127.0.0.1`, ip`10.0.0.1`, ip`10.0.0.2`])
  })
})
