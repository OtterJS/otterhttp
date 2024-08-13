import type { IncomingHttpHeaders, OutgoingHttpHeaders, ServerResponse } from 'node:http'

export type HasIncomingHeaders = { headers: IncomingHttpHeaders }

export type HasMethod = { method: string }

export type HasOutgoingHeaders = Pick<
  ServerResponse,
  'getHeader' | 'getHeaders' | 'setHeader' | 'appendHeader' | 'getHeaderNames' | 'hasHeader' | 'removeHeader'
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
  'writeContinue' | 'writeHead' | 'writeEarlyHints' | 'writeProcessing'
>

export type Headers = OutgoingHttpHeaders & {
  'content-type'?: string | undefined
  vary?: string | string[] | undefined
}

export type AppendHeaders = {
  [Key in keyof Headers]: string[] extends Headers[Key] ? string | readonly string[] : never
}

export type Input<T> = Exclude<T, undefined>
