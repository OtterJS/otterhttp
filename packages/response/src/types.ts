import type { IncomingHttpHeaders, OutgoingHttpHeaders, ServerResponse } from "node:http"
import type { Request } from "@otterhttp/request"

import type { SetCookieOptions } from "./cookie"
import type { Response } from "./prototype"

export type HasIncomingHeaders = { headers: IncomingHttpHeaders }

export type HasAccepts = Pick<Request, "accepts">

export type HasMethod = { method: string }

export type HasOutgoingHeaders = Pick<
  Response,
  | "getHeader"
  | "getHeaders"
  | "setHeader"
  | "appendHeader"
  | "getHeaderNames"
  | "hasHeader"
  | "removeHeader"
  | "headersSent"
>

export type HasStatus = {
  statusCode: number
  statusMessage: string | undefined
}

export type HasReq<Request> = {
  readonly req: Request
}

export type HasWriteMethods = Pick<
  ServerResponse,
  "writeContinue" | "writeHead" | "writeEarlyHints" | "writeProcessing"
>

type ExtraHeaders = {
  "content-type"?: string | undefined
  vary?: string | string[] | undefined
}

// https://stackoverflow.com/a/76616671
type Omit<T, K extends PropertyKey> = { [P in keyof T as Exclude<P, K>]: T[P] }

export type Headers = Omit<OutgoingHttpHeaders, keyof ExtraHeaders> & ExtraHeaders

export type AppendHeaders = {
  [Key in keyof Headers]: string[] extends Headers[Key] ? string | readonly string[] : never
}

export type Input<T> = Exclude<T, undefined>

export type ResponseAppSettings = {
  setCookieOptions?: SetCookieOptions
}
