import type { IncomingHttpHeaders, ServerResponse } from 'node:http'

export type HasIncomingHeaders = { headers: IncomingHttpHeaders }

export type HasOutgoingHeaders = Pick<
  ServerResponse,
  | 'getHeader'
  | 'getHeaders'
  | 'setHeader'
  | 'appendHeader'
  | 'getHeaderNames'
  | 'hasHeader'
  | 'removeHeader'
  | 'headersSent'
>

export type HasStatus = {
  statusCode: number
  statusMessage: string | undefined
}

export type HasFreshness = { validatePreconditions(): unknown }

export type HasMethod = { method: string }

export type HasReq<Request> = {
  readonly req: Request
}

export type HasWriteMethods = Pick<
  ServerResponse,
  'writeContinue' | 'writeHead' | 'writeEarlyHints' | 'writeProcessing'
>

export type JSONLiteral = never | Record<string, unknown> | Array<unknown> | string | number | boolean | null
