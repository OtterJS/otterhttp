import type { Server } from "node:http"
import { App, type Request, type Response } from "@/packages/app/src"
import type { Handler } from "@/packages/app/src"
import { type FetchFunction, makeFetch } from "supertest-fetch"

export const InitAppAndTest = (
  handler: Handler,
  route?: string,
  method = "get",
  settings: ConstructorParameters<typeof App>[0] = {},
  // @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/pull/70289
): { fetch: FetchFunction; app: App; server: Server<typeof Request, typeof Response<Request>> } => {
  const app = new App(settings)

  if (route) app[method.toLowerCase()](route, handler)
  else app.use(handler)

  const server = app.listen()

  const fetch = makeFetch(server)

  return { fetch, app, server }
}
