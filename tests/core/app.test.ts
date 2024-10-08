import { readFile } from "node:fs/promises"
import http from "node:http"
import { renderFile } from "eta"
import { makeFetch } from "supertest-fetch"
import { describe, expect, it } from "vitest"

import { App, Request, type Response, type View } from "@/packages/app/src"
import type { RouterMethod } from "@/packages/router/src"
import type { JSONLiteral } from "@/packages/send/src"
import { InitAppAndTest } from "@/test_helpers/initAppAndTest"

describe("Testing App", () => {
  it("should launch a basic server", async () => {
    const { fetch } = InitAppAndTest((_req, res) => void res.send("Hello World"))

    await fetch("/").expect(200, "Hello World")
  })
  it("should chain middleware", () => {
    const app = new App()

    app.use((_req, _res, next) => next()).use((_req, _res, next) => next())

    expect(app.middleware.length).toBe(2)
  })
  it("app.locals are get and set", () => {
    const app = new App()

    app.locals.hello = "world"

    expect(app.locals.hello).toBe("world")
  })
  it("Custom fall through handler works", async () => {
    const app = new App()

    app.use((req, res) => res.status(404).end(`Oopsie! Page ${req.url} is lost.`))

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/").expect(404, "Oopsie! Page / is lost.")
  })
  it("Custom onError works", async () => {
    const app = new App({
      onError: (err, req, res) => res.status(500).end(`Ouch, ${err} hurt me on ${req.url} page.`),
    })

    app.use(() => {
      throw "you"
    })

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/").expect(500, "Ouch, you hurt me on / page.")
  })

  it("App works with HTTP 1.1", async () => {
    const app = new App()

    const server = http.createServer({
      IncomingMessage: Request,
    })

    server.on("request", app.attach)

    await makeFetch(server)("/").expect(404)
  })
  it("req and res inherit properties from previous middlewares", async () => {
    const app = new App()

    app
      .use((req, _res, next) => {
        req.body = { hello: "world" }
        next()
      })
      .use((req, res) => {
        res.json(req.body as JSONLiteral)
      })

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/").expect(200, { hello: "world" })
  })
  it("req and res inherit properties from previous middlewares asynchronously", async () => {
    const app = new App()

    app
      .use(async (req, _res, next) => {
        req.body = await readFile(`${process.cwd()}/tests/fixtures/test.txt`)
        next()
      })
      .use((req, res) => res.send((req.body as any).toString()))

    const server = app.listen()

    await makeFetch(server)("/").expect(200, "I am a text file.")
  })
})

describe("Testing App routing", () => {
  it("should add routes added before app.use", async () => {
    const app = new App()

    const router = new App()
    router.get("/list", (_, res) => {
      res.send("router/list")
    })

    router.get("/find", (_, res) => {
      res.send("router/find")
    })
    app.use("/router", router)

    const server = app.listen(3000)
    const fetch = makeFetch(server)

    await fetch("/router/list").expect(200, "router/list")
    await fetch("/router/find").expect(200, "router/find")
  })
  it("should respond on matched route", async () => {
    const { fetch } = InitAppAndTest((_req, res) => void res.send("Hello world"), "/route")

    await fetch("/route").expect(200, "Hello world")
  })
  it("should match wares containing base path", async () => {
    const app = new App()

    const server = app.listen()

    app.use("/abc", (_req, res) => void res.send("Hello world"))

    const fetch = makeFetch(server)

    await fetch("/abc/def").expect(200, "Hello world")
    await fetch("/abcdef").expect(404)
  })
  it('"*" should catch all undefined routes', async () => {
    const app = new App()

    const server = app.listen()

    app
      .get("/route", (_req, res) => void res.send("A different route"))
      .all("*", (_req, res) => void res.send("Hello world"))

    const fetch = makeFetch(server)

    await fetch("/route").expect(200, "A different route")
    await fetch("/test").expect(200, "Hello world")
  })
  it("should throw 404 on no routes", async () => {
    await makeFetch(new App().listen())("/").expect(404)
  })
  it("should flatten the array of wares", async () => {
    const app = new App()

    let counter = 1

    app.use("/abc", [(_1, _2, next) => counter++ && next(), (_1, _2, next) => counter++ && next()], (_req, res) => {
      expect(counter).toBe(3)
      res.send("Hello World")
    })

    await makeFetch(app.listen())("/abc").expect(200, "Hello World")
  })
  it("should can set url prefix for the application", async () => {
    const app = new App()

    const route1 = new App()
    route1.get("/route1", (_req, res) => res.send("route1"))

    const route2 = new App()
    route2.get("/route2", (_req, res) => res.send("route2"))

    const route3 = new App()
    route3.get("/route3", (_req, res) => res.send("route3"))

    app.use("/abc", ...[route1, route2, route3])

    const fetch = makeFetch(app.listen())

    await fetch("/abc/route1").expect(200, "route1")
    await fetch("/abc/route2").expect(200, "route2")
    await fetch("/abc/route3").expect(200, "route3")
  })
  it("should not pollute req.params", async () => {
    const app = new App()

    app.use("/foo/:foo", (_req, _res, next) => next())
    app.use("/foo/:bar", (req, res) => res.json(req.params))

    const fetch = makeFetch(app.listen())

    await fetch("/foo/baz").expect(200, { bar: "baz" })
  })

  describe("next()", () => {
    it("next function skips current middleware", async () => {
      const app = new App()

      app.locals.log = "test"

      app
        .use((req, _res, next) => {
          app.locals.log = req.url
          next()
        })
        .use((_req, res) => void res.json({ ...app.locals }))

      await makeFetch(app.listen())("/").expect(200, { log: "/" })
    })
    it("errors in async wares do not destroy the app", async () => {
      const app = new App()

      app.use(async (_req, _res) => {
        throw "bruh"
      })

      const server = app.listen()

      await makeFetch(server)("/").expect(500, "bruh")
    })

    it("errors in sync wares do not destroy the app", async () => {
      const app = new App()

      app.use((_req, _res) => {
        throw "bruh"
      })

      const server = app.listen()

      await makeFetch(server)("/").expect(500, "bruh")
    })
  })
})

describe("App methods", () => {
  it("`app.set` sets a setting", () => {
    const app = new App().set("subdomainOffset", 1)

    expect(app.settings.subdomainOffset).toBe(1)
  })
  it("app.enable enables a setting", () => {
    const app = new App({
      settings: {
        xPoweredBy: false,
      },
    }).enable("xPoweredBy")

    expect(app.settings.xPoweredBy).toBe(true)
  })
  it("app.disable disables a setting", async () => {
    const app = new App({
      settings: {
        xPoweredBy: true,
      },
    }).disable("xPoweredBy")

    expect(app.settings.xPoweredBy).toBe(false)
  })
  it("app.route works properly", async () => {
    const app = new App()

    app.route("/").get((req, res) => res.end(req.url))

    const server = app.listen()

    await makeFetch(server)("/").expect(200)
  })
  it("app.route supports chaining route methods", async () => {
    const app = new App()

    app.route("/").get((req, res) => res.end(req.url))

    const server = app.listen()

    await makeFetch(server)("/").expect(200)
  })
  it("app.route supports chaining route methods", async () => {
    const app = new App()

    app
      .route("/")
      .get((_, res) => res.send("GET request"))
      .post((_, res) => res.send("POST request"))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/").expect(200, "GET request")
    await fetch("/", { method: "POST" }).expect(200, "POST request")
  })
})

describe("HTTP methods", () => {
  it("app.get handles get request", async () => {
    const app = new App()

    app.get("/", (req, res) => void res.send(req.method))

    await makeFetch(app.listen())("/").expect(200, "GET")
  })
  it("app.post handles post request", async () => {
    const { fetch } = InitAppAndTest((req, res) => void res.send(req.method), "/", "POST")

    await fetch("/", {
      method: "POST",
    }).expect(200, "POST")
  })
  it("app.put handles put request", async () => {
    const { fetch } = InitAppAndTest((req, res) => void res.send(req.method), "/", "PUT")

    await fetch("/", {
      method: "PUT",
    }).expect(200, "PUT")
  })
  it("app.patch handles patch request", async () => {
    const { fetch } = InitAppAndTest((req, res) => void res.send(req.method), "/", "PATCH")

    await fetch("/", { method: "PATCH" }).expect(200, "PATCH")
  })
  it("app.head handles head request", async () => {
    const app = new App()

    app.head("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "HEAD" }).expect(200, "")
  })
  it("app.delete handles delete request", async () => {
    const app = new App()

    app.delete("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "DELETE" }).expect(200, "DELETE")
  })
  it("app.checkout handles checkout request", async () => {
    const app = new App()

    app.checkout("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "CHECKOUT" }).expect(200, "CHECKOUT")
  })
  it("app.copy handles copy request", async () => {
    const app = new App()

    app.copy("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "COPY" }).expect(200, "COPY")
  })
  it("app.lock handles lock request", async () => {
    const app = new App()

    app.lock("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "LOCK" }).expect(200, "LOCK")
  })
  it("app.merge handles merge request", async () => {
    const app = new App()

    app.merge("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "MERGE" }).expect(200, "MERGE")
  })
  it("app.mkactivity handles mkactivity request", async () => {
    const app = new App()

    app.mkactivity("/", (req, res) => void res.send(req.method))

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/", { method: "MKACTIVITY" }).expect(200, "MKACTIVITY")
  })
  it("app.mkcol handles mkcol request", async () => {
    const app = new App()

    app.mkcol("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "MKCOL" }).expect(200, "MKCOL")
  })
  it("app.move handles move request", async () => {
    const app = new App()

    app.move("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "MOVE" }).expect(200, "MOVE")
  })
  it("app.search handles search request", async () => {
    const app = new App()

    app.search("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "SEARCH" }).expect(200, "SEARCH")
  })
  it("app.notify handles notify request", async () => {
    const app = new App()

    app.notify("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "NOTIFY" }).expect(200, "NOTIFY")
  })
  it("app.purge handles purge request", async () => {
    const app = new App()

    app.purge("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "PURGE" }).expect(200, "PURGE")
  })
  it("app.report handles report request", async () => {
    const app = new App()

    app.report("/", (req, res) => void res.send(req.method))

    const fetch = makeFetch(app.listen())

    await fetch("/", { method: "REPORT" }).expect(200, "REPORT")
  })
  it("app.subscribe handles subscribe request", async () => {
    const app = new App()

    app.subscribe("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "SUBSCRIBE" }).expect(200, "SUBSCRIBE")
  })
  it("app.unsubscribe handles unsubscribe request", async () => {
    const app = new App()

    app.unsubscribe("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "UNSUBSCRIBE" }).expect(200, "UNSUBSCRIBE")
  })
  it("app.trace handles trace request", async () => {
    const app = new App()

    app.trace("/", (req, res) => void res.send(req.method))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "TRACE" }).expect(200, "TRACE")
  })
  it("HEAD request works when any of the method handlers are defined", async () => {
    const app = new App()

    app.get("/", (_, res) => res.send("It works"))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/", { method: "HEAD" }).expect(200)
  })
  it("HEAD request does not work for undefined handlers", async () => {
    const app = new App()

    app.get("/", (_, res) => res.send("It works"))

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/hello", { method: "HEAD" }).expect(404)
  })
})

describe("Route handlers", () => {
  it("router accepts array of middlewares", async () => {
    const app = new App()

    app.use("/", [
      (req, _, n) => {
        req.body = "hello"
        n()
      },
      (req, _, n) => {
        req.body += " "
        n()
      },
      (req, _, n) => {
        req.body += "world"
        n()
      },
      (req, res) => {
        res.send(req.body as string)
      },
    ])

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/").expect(200, "hello world")
  })
  it("router accepts path as array of middlewares", async () => {
    const app = new App()

    app.use([
      (req, _, n) => {
        req.body = "hello"
        n()
      },
      (req, _, n) => {
        req.body += " "
        n()
      },
      (req, _, n) => {
        req.body += "world"
        n()
      },
      (req, res) => {
        res.send(req.body as string)
      },
    ])

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/").expect(200, "hello world")
  })
  it("router accepts list of middlewares", async () => {
    const app = new App()

    app.use(
      (req, _, n) => {
        req.body = "hello"
        n()
      },
      (req, _, n) => {
        req.body += " "
        n()
      },
      (req, _, n) => {
        req.body += "world"
        n()
      },
      (req, res) => {
        res.send(req.body as string)
      },
    )

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/").expect(200, "hello world")
  })
  it("router accepts array of wares", async () => {
    const app = new App()

    app.get(
      "/",
      [
        (req, _, n) => {
          req.body = "hello"
          n()
        },
      ],
      [
        (req, _, n) => {
          req.body += " "
          n()
        },
      ],
      [
        (req, _, n) => {
          req.body += "world"
          n()
        },
        (req, res) => {
          res.send(req.body as string)
        },
      ],
    )

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/").expect(200, "hello world")
  })
  it("router methods do not match loosely", async () => {
    const app = new App()

    app.get("/route", (_, res) => res.send("found"))

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/route/subroute").expect(404)

    await fetch("/route").expect(200, "found")
  })
  it("should accept array of paths", async () => {
    const app = new App()

    app.get(["/route1", "/route2"], (_, res) => res.send("found"))

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/route1").expect(200, "found")

    await fetch("/route2").expect(200, "found")

    expect(app.middleware).toHaveLength(2)
  })
})

describe("Subapps", () => {
  it("sub-app mounts on a specific path", () => {
    const app = new App()

    const subApp = new App()

    app.use("/subapp", subApp)

    expect(subApp.mountpath).toBe("/subapp")
  })
  describe("when a sub-app is mounted on root", () => {
    it("should execute sub-app middleware when matched", async () => {
      const app = new App()

      const subApp = new App()

      subApp.use((_, res) => void res.send("Hello World!"))

      app.use(subApp)

      const server = app.listen()
      const fetch = makeFetch(server)
      await fetch("/").expect(200, "Hello World!")
    })
    describe.each([
      { verb: (app: App) => app.get.bind(app), name: ".get", fetchWithVerb: "get" },
      { verb: (app: App) => app.all.bind(app), name: ".all", fetchWithVerb: "get" },
    ])(
      "when sub-app registers middleware with $name",
      ({
        verb,
        fetchWithVerb,
      }: {
        verb: (app: App) => RouterMethod<Request, Response, App>
        fetchWithVerb: string
      }) => {
        it("should continue middleware execution when '.use'd sub-app middleware is exhausted", async () => {
          const app = new App()

          const subApp = new App()
          verb(subApp)((_req, res) => res.send("foo"))

          app.use("/", subApp)
          verb(app)("/bar", (_req, res) => res.send("bar"))

          const fetch = makeFetch(app.listen())

          await fetch("/", { method: fetchWithVerb }).expect(200, "foo")
          await fetch("/bar", { method: fetchWithVerb }).expect(200, "bar")
        })
        it("should continue middleware execution when '.route' sub-app middleware is exhausted", async () => {
          const app = new App()

          const subApp = app.route("/")
          verb(subApp)((_req, res) => res.send("foo"))

          verb(app)("/bar", (_req, res) => res.send("bar"))

          const fetch = makeFetch(app.listen())

          await fetch("/", { method: fetchWithVerb }).expect(200, "foo")
          await fetch("/bar", { method: fetchWithVerb }).expect(200, "bar")
        })
      },
    )
  })
  it("multiple sub-apps mount on root", async () => {
    const app = new App()

    const route1 = new App()
    route1.get("/route1", (_req, res) => res.send("route1"))

    const route2 = new App()
    route2.get("/route2", (_req, res) => res.send("route2"))

    app.use(route1)
    app.use(route2)

    const fetch = makeFetch(app.listen())

    await fetch("/route1").expect(200, "route1")
    await fetch("/route2").expect(200, "route2")
  })
  it("sub-app handles its own path", async () => {
    const app = new App()

    const subApp = new App()

    subApp.use((_, res) => void res.send("Hello World!"))

    app.use("/subapp", subApp)

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/subapp").expect(200, "Hello World!")
  })
  it("sub-app paths get prefixed with the mount path", async () => {
    const app = new App()

    const subApp = new App()

    subApp.get("/route", (_, res) => res.send(`Hello from ${subApp.mountpath}`))

    app.use("/subapp", subApp)

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/subapp/route").expect(200, "Hello from /subapp")
  })
  it("sub-app gets mounted via `app.route`", async () => {
    const app = new App()

    app.route("/path").get((_, res) => res.send("Hello World"))
  })
  it("req.url does not change", async () => {
    const app = new App()

    const subApp = new App()

    subApp.get("/route", (req, res) =>
      res.json({
        url: req.url,
        path: req.pathname,
        subpath: req.subpathname,
      }),
    )

    app.use("/subapp", subApp)

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/subapp/route?foo=bar").expect(200, {
      path: "/subapp/route",
      url: "/subapp/route?foo=bar",
      subpath: "/",
    })
  })

  it("lets other wares handle the URL if subapp doesnt have that path", async () => {
    const app = new App()

    const subApp = new App()

    subApp.get("/route", (_, res) => res.send(subApp.mountpath))

    app.use("/test", subApp)

    app.use("/test3", (req, res) => res.send(req.subpathname))

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/test/route").expect(200, "/test")

    await fetch("/test3/abc").expect(200, "/abc")
  })

  it("should mount app on a specified path", () => {
    const app = new App()

    const subapp = new App()

    app.use("/subapp", subapp)

    expect(subapp.mountpath).toBe("/subapp")
  })
  it('should mount on "/" if path is not specified', () => {
    const app = new App()

    const subapp = new App()

    app.use(subapp)

    expect(subapp.mountpath).toBe("/")
  })
  it("app.parent should reference to the app it was mounted on", () => {
    const app = new App()

    const subapp = new App()

    app.use(subapp)

    expect(subapp.parent).toBe(app)
  })
  it("app.path() should return the mountpath", () => {
    const app = new App()

    const subapp = new App()

    app.use("/subapp", subapp)

    expect(subapp.path()).toBe("/subapp")
  })
  it("app.path() should nest mountpaths", () => {
    const app = new App()

    const subapp = new App()

    const subsubapp = new App()

    subapp.use("/admin", subsubapp)

    app.use("/blog", subapp)

    expect(subsubapp.path()).toBe("/blog/admin")
  })
  it("app.path() should nest multiple mountpaths for a single subapp", () => {
    const app = new App()

    const subapp = new App()

    const subsubapp = new App()

    app.use(["/t1", "/t2"], subapp)

    subapp.use("/t3", subsubapp)

    expect(subsubapp.path()).toBe("/t1, /t2/t3")
  })
  it("app.path() should nest multiple mountpaths for multiple subapp", () => {
    const app = new App()

    const subapp = new App()

    const subsubapp = new App()

    app.use(["/t1", "/t2"], subapp)

    subapp.use(["/t3", "/t4"], subsubapp)

    expect(subsubapp.path()).toBe("/t1, /t2/t3, /t4")
  })
  it("middlewares of a subapp should preserve the path", () => {
    const app = new App()

    const subapp = new App()

    subapp.use("/path", (_req, _res) => void 0)

    app.use("/subapp", subapp)

    expect(subapp.middleware[0].path).toBe("/path")
  })
  it("matches when mounted on params", async () => {
    const app = new App()

    const subApp = new App()

    subApp.get("/", (req, res) => res.send(req.params.userID))

    app.use("/users/:userID", subApp)

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/users/123/").expect(200, "123")
  })
  it("matches when mounted on params and on custom subapp route", async () => {
    const app = new App()

    const subApp = new App()

    subApp.get("/route", (req, res) => res.send(req.params.userID))

    app.use("/users/:userID", subApp)

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/users/123/route").expect(200, "123")
  })
  it("matches when subapp using route with params is mounted on params", async () => {
    const app = new App()

    const subapp = new App()

    subapp.get("/bar/:bar", (req, res) => res.json({ foo: req.params.foo, bar: req.params.bar }))

    app.use("/foo/:foo", subapp)

    const server = app.listen()
    const fetch = makeFetch(server)
    await fetch("/foo/abc/bar/123").expect(200, { foo: "abc", bar: "123" })
  })
  it("sends bad request on malformed params", async () => {
    const app = new App()

    app.get("/:id", (req, res) => res.json(req.params))

    const server = app.listen()

    const fetch = makeFetch(server)
    await fetch("/%").expect(400, "Bad Request")
  })
  it("handles errors by parent when no onError specified", async () => {
    const app = new App({
      onError: (err, req, res) => res.status(500).end(`Ouch, ${err} hurt me on ${req.pathname} page.`),
    })

    const subApp = new App()

    subApp.get("/route", (_req, _res, _next) => {
      throw "you"
    })

    app.use("/subapp", subApp)

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/subapp/route").expect(500, "Ouch, you hurt me on /subapp/route page.")
  })
  it("handles errors in sub when onError is defined", async () => {
    const app = new App({
      onError: (err, req, res) => res.status(500).end(`Ouch, ${err} hurt me on ${req.pathname} page.`),
    })

    const subApp = new App({
      onError: (err, req, res) => res.status(500).end(`Handling ${err} from child on ${req.pathname} page.`),
    })

    subApp.get("/route", () => {
      throw "you"
    })

    app.use("/subapp", subApp).listen()

    const server = app.listen()
    const fetch = makeFetch(server)

    await fetch("/subapp/route").expect(500, "Handling you from child on /subapp/route page.")
  })
  it("subapps mount on path regardless if path has leading slash", async () => {
    const app = new App()
    const subApp = new App()
    subApp.get("/foo", (_req, res) => {
      res.send("foo")
    })
    app.use("/bar1", subApp)
    app.use("bar2", subApp)
    const fetch = makeFetch(app.listen())
    await fetch("/bar1/foo").expect(200, "foo")
    await fetch("/bar2/foo").expect(200, "foo")
  })
})

describe("Template engines", () => {
  describe("app.engine", () => {
    it("registers a new engine", () => {
      const app = new App()

      app.engine(".eta", renderFile)

      expect(app.engines).toEqual({ ".eta": renderFile })
    })
    it("appends a dot if not passed", () => {
      const app = new App()

      app.engine("eta", renderFile)

      expect(app.engines).toEqual({ ".eta": renderFile })
    })
  })

  // Ported from https://github.com/expressjs/express/blob/3531987844e533742f1159b0c3f1e07fad2e4597/test/app.render.js
  describe("app.render", async () => {
    it("should support absolute paths", async () => {
      const app = new App()

      app.engine("eta", renderFile)
      app.locals.name = "v1rtl"

      const render = await app.render(`${process.cwd()}/tests/fixtures/views/index.eta`, {})
      expect(render).toEqual("Hello from v1rtl")
    })
    it("should expose app.locals", async () => {
      const app = new App({
        settings: {
          views: `${process.cwd()}/tests/fixtures/views`,
        },
      })
      app.engine("eta", renderFile)
      app.locals.name = "v1rtl"

      const render = await app.render("index.eta", {})
      expect(render).toEqual("Hello from v1rtl")
    })
    it("should support index files", async () => {
      const app = new App({
        settings: {
          views: `${process.cwd()}/tests/fixtures`,
        },
      })
      app.engine("eta", renderFile)
      app.set("view engine", "eta")
      app.locals.name = "v1rtl"

      const render = await app.render("views", {})
      expect(render).toEqual("Hello from v1rtl")
    })
    describe("errors", () => {
      it("should catch errors", async () => {
        const app = new App({
          settings: {
            views: `${process.cwd()}/tests/fixtures`,
          },
        })

        class TestView {
          render() {
            throw new Error("oops")
          }
        }

        app.set("view", TestView as unknown as typeof View)

        await expect(app.render("nothing", {})).rejects.toThrow()
      })
      it("when the file does not exist should provide a helpful error", async () => {
        const app = new App({
          settings: {
            views: `${process.cwd()}/tests/fixtures`,
          },
        })
        app.engine("eta", renderFile)

        await expect(app.render("ate.eta", {})).rejects.toThrow(
          `Failed to lookup view "ate.eta" in views directory "${process.cwd()}/tests/fixtures"`,
        )
      })
      it("when error occurs should trigger a callback", async () => {
        const app = new App({
          settings: {
            views: `${process.cwd()}/tests/fixtures/views`,
          },
        })
        app.engine("eta", renderFile)
        await expect(app.render("error.eta", {})).rejects.toThrow(ReferenceError)
      })
    })

    describe("multiple roots", () => {
      it("should lookup the file in paths", async () => {
        const app = new App({
          settings: {
            views: [`${process.cwd()}/tests/fixtures/views/root1`, `${process.cwd()}/tests/fixtures/views/root2`],
          },
        })
        app.engine("eta", renderFile)
        app.locals.user = { name: "v1rtl" }

        const render = await app.render("user.eta", {})
        expect(render).toEqual("<p>v1rtl</p>")
      })
      it("should look until the file is found", async () => {
        const app = new App({
          settings: {
            views: [`${process.cwd()}/tests/fixtures/views/root1`, `${process.cwd()}/tests/fixtures/views/root2`],
          },
        })
        app.engine("eta", renderFile)

        const render = await app.render("home.eta", {})
        expect(render).toEqual("this is a home page")
      })
      it("should error if could not find the file", async () => {
        const app = new App({
          settings: {
            views: [`${process.cwd()}/tests/fixtures/views/root1`, `${process.cwd()}/tests/fixtures/views/root2`],
          },
        })
        app.engine("eta", renderFile)

        await expect(app.render("uknown.eta", {})).rejects.toThrow(
          /Failed to lookup view "uknown.eta" in views directories/,
        )
      })
    })

    it("supports custom View", async () => {
      const app = new App()

      class TestView {
        name: string
        path = "test"
        constructor(name: string) {
          this.name = name
        }
        async render(_options: never, _data: never) {
          return "testing"
        }
      }

      app.set("view", TestView)

      const render = await app.render("something", {})
      expect(render).toEqual("testing")
    })

    describe("caching", () => {
      it("should always lookup view without cache", async () => {
        const app = new App()

        let count = 0

        class TestView {
          name: string
          path = "test"
          constructor(name: string) {
            this.name = name
            count++
          }
          async render(_options: never, _data: never) {
            return "testing"
          }
        }

        app.set("view cache", false)
        app.set("view", TestView)

        const firstRender = await app.render("something", {})
        expect(count).toEqual(1)
        expect(firstRender).toEqual("testing")

        const secondRender = await app.render("something", {})
        expect(count).toEqual(2)
        expect(secondRender).toEqual("testing")
      })
      it('should cache with "view cache" setting', async () => {
        const app = new App()

        let count = 0

        class TestView {
          name: string
          path = "test"
          constructor(name: string) {
            this.name = name
            count++
          }
          async render(_options: never, _data: never) {
            return "testing"
          }
        }

        app.set("view cache", true)
        app.set("view", TestView)

        const firstRender = await app.render("something", {})
        expect(count).toEqual(1)
        expect(firstRender).toEqual("testing")

        const secondRender = await app.render("something", {})
        expect(count).toEqual(1)
        expect(secondRender).toEqual("testing")
      })
    })
  })
})

describe("App settings", () => {
  describe("xPoweredBy", () => {
    it("is enabled by default", () => {
      const app = new App()

      expect(app.settings.xPoweredBy).toBe(true)
    })
    it('should set X-Powered-By to "otterhttp"', async () => {
      const { fetch } = InitAppAndTest((_req, res) => void res.send("hi"))

      await fetch("/").expectHeader("X-Powered-By", "otterhttp")
    })
    it("when disabled should not send anything", async () => {
      const app = new App({ settings: { xPoweredBy: false } })

      app.use((_req, res) => void res.send("hi"))

      const server = app.listen()

      const fetch = makeFetch(server)

      await fetch("/").expectHeader("X-Powered-By", null)
    })
  })
  describe("enableReqRoute", () => {
    it("attach current fn to req.route when enabled", async () => {
      const app = new App({ settings: { enableReqRoute: true } })

      app.use((req, res) => {
        expect(req.route).toEqual(app.middleware[0])
        res.end()
      })

      const server = app.listen()

      const fetch = makeFetch(server)

      await fetch("/").expect(200)
    })
  })
  it("returns the correct middleware if there are more than one", async () => {
    const app = new App({ settings: { enableReqRoute: true } })
    expect.assertions(2)
    app.use("/home", (req, res) => {
      expect(req.route).toEqual(app.middleware[0])
      res.end()
    })

    app.use("/main", (req, res) => {
      expect(req.route).toEqual(app.middleware[1])
      res.end()
    })

    const server = app.listen()

    const fetch = makeFetch(server)

    await fetch("/home").expect(200)
    await fetch("/main").expect(200)
  })
})
