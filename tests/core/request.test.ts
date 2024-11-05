import { Agent } from "node:http"
import { makeFetch } from "supertest-fetch"
import { assert, afterEach, describe, expect, it, vi } from "vitest"

import { App, type Request, type Response } from "@/packages/app/src"
import * as reqGetHeader from "@/packages/request/src/get-header"
import { InitAppAndTest } from "@/test_helpers/initAppAndTest"

vi.mock<typeof reqGetHeader>(import("@/packages/request/src/get-header"), async (importOriginal) => {
  const module = await importOriginal()

  return {
    ...module,
    getRequestHeader: vi.fn(module.getRequestHeader),
  } satisfies typeof reqGetHeader
})

describe("Request properties", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should have default HTTP Request properties", async () => {
    const { fetch } = InitAppAndTest((req, res) => {
      res.status(200).json({
        url: req.url,
        headersSent: res.headersSent,
      })
    })

    await fetch("/").expect(200, { url: "/", headersSent: false })
  })

  describe("URL extensions", () => {
    it("req.query is being parsed properly", async () => {
      const { fetch } = InitAppAndTest((req, res) => void res.json(req.query))

      await fetch("/?param1=val1&param2=val2").expect(200, {
        param1: "val1",
        param2: "val2",
      })
    })
    it("req.params is being parsed properly", async () => {
      const { fetch } = InitAppAndTest((req, res) => void res.json(req.params), "/:param1/:param2")

      await fetch("/val1/val2").expect(200, {
        param1: "val1",
        param2: "val2",
      })
    })
    it("req.subpathname does not include the mount path", async () => {
      const app = new App()

      app.use("/abc", (req, res) => res.send(req.subpathname))

      const server = app.listen()

      const fetch = makeFetch(server)

      await fetch("/abc/def").expect(200, "/def")
    })
    it("should set the correct req.subpathname on routes even in a subapp", async () => {
      const echo = (req: Request, res: Response) =>
        res.json({ subpath: req.subpathname, params: Object.fromEntries(req.params) })
      const makeApp = () => new App().get("/a1/b/*", echo).get("/a2/b/:pat", echo)

      const app = makeApp()
      app.use("/s/:pat1/:pat2", makeApp())
      const fetch = makeFetch(app.listen())

      await fetch("/a1/b/c").expect(200, {
        subpath: "/",
        params: { wild: "c" },
      })

      await fetch("/a2/b/c").expect(200, {
        subpath: "/",
        params: { pat: "c" },
      })

      await fetch("/s/t/u/a1/b/c").expect(200, {
        subpath: "/",
        params: { pat1: "t", pat2: "u", wild: "c" },
      })

      await fetch("/s/t/u/a2/b/c").expect(200, {
        subpath: "/",
        params: { pat1: "t", pat2: "u", pat: "c" },
      })
    })
    it("should set the correct req.subpathname on middlewares even in a subapp", async () => {
      const echo = (req: Request, res: Response) =>
        res.json({ subpath: req.subpathname, params: Object.fromEntries(req.params) })
      const mw = (req, _res, next) => {
        req.subpathnames ??= []
        req.subpathnames.push(req.subpathname)
        next()
      }
      const makeApp = () =>
        new App<Request & { subpaths?: string[] }>()
          .get("/", echo)
          .use("/a1/b", echo)
          .use("/a2/b", mw, mw, mw, (req, res) =>
            res.json({ subpaths: req.subpathnames, params: Object.fromEntries(req.params) }),
          )
          .use("/a3/:pat1/:pat2", echo)
          .use("/a4/:pat1/*", echo)

      const app = makeApp()
      app.use("/s/:pat", makeApp())
      const fetch = makeFetch(app.listen())

      await fetch("/a1/b/c").expect(200, {
        subpath: "/c",
        params: {},
      })

      await fetch("/a2/b/c").expect(200, {
        subpaths: ["/c", "/c", "/c"],
        params: {},
      })

      await fetch("/a3/b/c/d").expect(200, {
        subpath: "/d",
        params: { pat1: "b", pat2: "c" },
      })

      await fetch("/a4/b/c/d").expect(200, {
        subpath: "/",
        params: { pat1: "b", wild: "c/d" },
      })

      await fetch("/s/t/a1/b/c").expect(200, {
        subpath: "/c",
        params: { pat: "t" },
      })

      await fetch("/s/t/a2/b/c").expect(200, {
        subpaths: ["/c", "/c", "/c"],
        params: { pat: "t" },
      })

      await fetch("/s/t/a3/b/c/d").expect(200, {
        subpath: "/d",
        params: { pat: "t", pat1: "b", pat2: "c" },
      })

      await fetch("/s/t/a4/b/c/d").expect(200, {
        subpath: "/",
        params: { pat: "t", pat1: "b", wild: "c/d" },
      })
    }, 0)
    it("should set the correct req.subpathname on a subapp mounted on a wildcard route, for both route and mw", async () => {
      const echo = (req: Request, res: Response) =>
        res.json({ subpath: req.subpathname, params: Object.fromEntries(req.params) })
      // Only possible route on subapps below * is / since * is greedy
      const subAppRoute = new App().get("/", echo)
      const subAppMw = new App().use("/", echo)
      const app = new App().use("/s1/*", subAppRoute).use("/s2/*", subAppMw)
      const fetch = makeFetch(app.listen())
      await fetch("/s1/a/b/c/d").expect(200, {
        subpath: "/",
        params: { wild: "a/b/c/d" },
      })
      await fetch("/s2/a/b/c/d").expect(200, {
        subpath: "/",
        params: { wild: "a/b/c/d" },
      })
    })
  })

  describe("Network extensions", () => {
    const ipHandler = (req, res) => {
      res.json({
        ip: req.ip.toString(),
        ips: req.ips.map((ip) => ip.toString()),
      })
    }

    it("IPv4 req.ip & req.ips is being parsed properly", async () => {
      const { fetch } = InitAppAndTest(ipHandler)

      const agent = new Agent({ family: 4 }) // ensure IPv4 only
      await fetch("/", { agent }).expect(200, {
        ip: "127.0.0.1",
        ips: ["127.0.0.1"],
      })
    })
    it("IPv6 req.ip & req.ips is being parsed properly", async () => {
      const { fetch } = InitAppAndTest(ipHandler)

      const agent = new Agent({ family: 6 }) // ensure IPv6 only
      await fetch("/", { agent }).expect(200, {
        ip: "::1",
        ips: ["::1"],
      })
    })
    it("IPv4 req.ip & req.ips do not trust proxies by default", async () => {
      const { fetch } = InitAppAndTest(ipHandler)

      const agent = new Agent({ family: 4 }) // ensure IPv4 only
      await fetch("/", { agent, headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2, 127.0.0.2" } }).expect(200, {
        ip: "127.0.0.1",
        ips: ["127.0.0.1"],
      })
    })
    it('IPv4 req.ip & req.ips support trusted proxies with "trust proxy"', async () => {
      const { fetch, app } = InitAppAndTest(ipHandler)
      app.set("trust proxy", ["127.0.0.1"])

      const agent = new Agent({ family: 4 }) // ensure IPv4 only
      await fetch("/", { agent, headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2, 127.0.0.2" } }).expect(200, {
        ip: "127.0.0.2",
        ips: ["127.0.0.1", "127.0.0.2"],
      })
    })
    it("req.protocol is http by default", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.send(`protocol: ${req.protocol}`)
      })

      await fetch("/").expect(200, "protocol: http")
    })
    it("req.protocol respects X-Forwarded-Proto when proxy is trusted", async () => {
      const { fetch, app } = InitAppAndTest((req, res) => {
        res.send(`protocol: ${req.protocol}`)
      })
      app.set("trust proxy", ["loopback"])

      const agentIpv4 = new Agent({ family: 4 }) // ensure IPv4 only
      await fetch("/", {
        agent: agentIpv4,
        headers: new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-for": "127.0.0.1",
        }),
      }).expect(200, "protocol: https")

      const agentIpv6 = new Agent({ family: 6 }) // ensure IPv4 only
      await fetch("/", {
        agent: agentIpv6,
        headers: new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-for": "::1",
        }),
      }).expect(200, "protocol: https")
    })
    it("req.protocol does not respect X-Forwarded-Proto when proxy is untrusted", async () => {
      const { fetch, app } = InitAppAndTest((req, res) => {
        res.send(`protocol: ${req.protocol}`)
      })

      const agentIpv4 = new Agent({ family: 4 }) // ensure IPv4 only
      await fetch("/", {
        agent: agentIpv4,
        headers: new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-for": "127.0.0.1",
        }),
      }).expect(200, "protocol: http")

      const agentIpv6 = new Agent({ family: 6 }) // ensure IPv4 only
      await fetch("/", {
        agent: agentIpv6,
        headers: new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-for": "::1",
        }),
      }).expect(200, "protocol: http")
    })
    it("req.secure is false by default", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.send(`secure: ${req.secure}`)
      })

      await fetch("/").expect(200, "secure: false")
    })
    it("req.subdomains is empty by default", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.send(`subdomains: ${req.subdomains?.join(", ")}`)
      })

      await fetch("/").expect(200, "subdomains: ")
    })
    it("should derive hostname from the host header and assign it to req.hostname", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.send(`hostname: ${req.hostname}`)
      })

      await fetch("/", { headers: { Host: "foo.bar:8080" } }).expect(200, "hostname: foo.bar")
    })
    it("should not derive hostname from the host header when multiple values are provided", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.send(`hostname: ${req.hostname}`)
      })

      const response = await fetch("/", { headers: { Host: ["foo.bar:8080", "bar.baz:8080"] } })
      assert(!response.ok)
    })
    it("should derive hostname from the :authority header and assign it to req.hostname", async () => {
      const { getRequestHeader }: typeof reqGetHeader = await vi.importActual("@/packages/request/src/get-header")
      vi.mocked(reqGetHeader.getRequestHeader).mockImplementation((req: Request, header: string) => {
        if (header === "host") return undefined
        if (header === ":authority") return "userinfo@bar.baz:8080"
        return getRequestHeader(req, header)
      })

      const { fetch } = InitAppAndTest((req, res) => {
        expect(req.getHeader("host")).toBeUndefined()
        res.send(`hostname: ${req.hostname}`)
      })

      const response = await fetch("/")
      expect(response.status).toBe(200)
      await expect(response.text()).resolves.toEqual("hostname: bar.baz")
    })
    it("should derive port from the host header and assign it to req.port", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.json({ port: req.port })
      })

      await fetch("/", { headers: { Host: "foo.bar:8080" } }).expect(200, { port: 8080 })
    })
    it("should derive port from the :authority header and assign it to req.port", async () => {
      const { getRequestHeader }: typeof reqGetHeader = await vi.importActual("@/packages/request/src/get-header")
      vi.mocked(reqGetHeader.getRequestHeader).mockImplementation((req: Request, header: string) => {
        if (header === "host") return undefined
        if (header === ":authority") return "bar.baz:8080"
        return getRequestHeader(req, header)
      })

      const { fetch, server } = InitAppAndTest((req, res) => {
        res.json({ port: req.port })
      })
      const serverAddress = server.address()
      if (typeof serverAddress === "string") throw new Error("Cannot listen on unix socket")

      const response = await fetch("/")
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ port: 8080 })
    })
    it("should reject request when the :authority header disagrees with the host header", async () => {
      const { getRequestHeader }: typeof reqGetHeader = await vi.importActual("@/packages/request/src/get-header")
      vi.mocked(reqGetHeader.getRequestHeader).mockImplementation((req: Request, header: string) => {
        if (header === "host") return "foo.bar"
        if (header === ":authority") return "bar.baz"
        return getRequestHeader(req, header)
      })

      const { fetch } = InitAppAndTest((req, res) => {
        res.json({ port: req.port })
      })
      const response = await fetch("/")
      expect(response.ok).toBe(false)
    })
    it("should not crash app when host header is malformed", async () => {
      const { fetch } = InitAppAndTest((req, res) => {
        res.json({ port: req.port })
      })

      await fetch("/", { headers: { host: "foo.bar:baz" } }).expect(500)
      await fetch("/", { headers: { Host: "foo.bar:8080" } }).expect(200, { port: 8080 })
    })
  })

  it("req.xhr is false because of node-superagent", async () => {
    const { fetch } = InitAppAndTest((req, res) => {
      res.send(`XMLHttpRequest: ${req.xhr ? "yes" : "no"}`)
    })

    await fetch("/").expect(200, "XMLHttpRequest: no")
  })

  it("req.pathname is the URL but without query parameters", async () => {
    const { fetch } = InitAppAndTest((req, res) => {
      res.send(`Path to page: ${req.pathname}`)
    })

    await fetch("/page?a=b").expect(200, "Path to page: /page")
  })
  it("req.pathname works properly for optional parameters", async () => {
    const { fetch } = InitAppAndTest((req, res) => {
      res.send(`Path to page: ${req.pathname}`)
    }, "/:format?/:uml?")

    await fetch("/page/page-1").expect(200, "Path to page: /page/page-1")
  })
})
