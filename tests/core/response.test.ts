import { describe, it } from "vitest"

import { InitAppAndTest } from "@/test_helpers/initAppAndTest"

describe("Response properties", () => {
  it("should have default HTTP Response properties", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.status(200).json({
        statusCode: res.statusCode,
        chunkedEncoding: res.chunkedEncoding,
      })
    })

    await fetch("/").expect({
      statusCode: 200,
      chunkedEncoding: false,
    })
  })
})

describe("Response methods", () => {
  it("res.json stringifies the object", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.json({ hello: "world" })
    })

    await fetch("/").expect({ hello: "world" })
  })
  it("res.send sends plain text data", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.send("Hello world")
    })

    await fetch("/").expect("Hello world")
  })
  it("res.status sends status", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.status(418).end()
    })

    await fetch("/").expect(418)
  })
  it("res.sendStatus sends status + text", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.sendStatus(418)
    })

    await fetch("/").expect(418, "I'm a Teapot")
  })
  it('res.location sends "Location" header', async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.location("example.com").end()
    })

    await fetch("/").expect("Location", "example.com")
  })
  it("res.setHeader sets headers", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.setHeader("X-Header", "Hello World").end()
    })

    await fetch("/").expect("X-Header", "Hello World")
  })
  it("res.send sets proper headers", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res.json({ hello: "world" })
    })

    await fetch("/").expect("Content-Type", "application/json; charset=utf-8").expect("Content-Length", "22")
  })
  it("res.links sends links", async () => {
    const { fetch } = InitAppAndTest((_req, res) => {
      res
        .links({
          next: "http://api.example.com/users?page=2",
          last: "http://api.example.com/users?page=5",
        })
        .end()
    })

    await fetch("/").expect(
      "Link",
      '<http://api.example.com/users?page=2>; rel="next", <http://api.example.com/users?page=5>; rel="last"',
    )
  })
  it("res.cookie sends cookies to client", async () => {
    const { fetch } = InitAppAndTest(async (_req, res) => {
      await res.cookie("Hello", "World")
      res.end()
    })

    await fetch("/").expect("Set-Cookie", "Hello=World; Path=/")
  })
  describe("res.contentType(type)", () => {
    it("should detect MIME type", async () => {
      const { fetch } = InitAppAndTest((_req, res) => {
        res.contentType("html").end()
      })

      await fetch("/").expect("Content-Type", "text/html; charset=utf-8")
    })
    it("should detect MIME type by extension", async () => {
      const { fetch } = InitAppAndTest((_req, res) => {
        res.contentType(".html").end()
      })

      await fetch("/").expect("Content-Type", "text/html; charset=utf-8")
    })
  })

  it("res.fresh and res.stale get set", async () => {
    const etag = "123"
    const { fetch } = InitAppAndTest(
      (_req, res) => {
        res.setHeader("ETag", etag).send("stale")
      },
      "/",
      "GET",
    )

    await fetch("/", { headers: { "If-None-Match": etag } }).expectStatus(304)
  })
})
