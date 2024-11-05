import type { Server } from "node:http"
import { type FetchFunction, makeFetch } from "supertest-fetch"

import { App, type Request, type Response } from "@/packages/app/src"
import type { Handler } from "@/packages/app/src"

export const InitAppAndTest = (
  handler: Handler,
  route?: string | undefined,
  method = "get",
  settings: ConstructorParameters<typeof App>[0] = {},
): { fetch: FetchFunction; app: App; server: Server<typeof Request, typeof Response<Request>> } => {
  const app = new App(settings)

  if (route) app[method.toLowerCase()](route, handler)
  else app.use(handler)

  const server = app.listen()

  const fetch = makeFetch(server)

  return { fetch, app, server }
}
