import type { IncomingHttpHeaders, ServerResponse } from 'node:http'
import type { Writable } from 'node:stream'

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

export type RateLimitRequest = HasIncomingHeaders &
  HasMethod & {
    rateLimit?: {
      limit: number
      current: number
      remaining: number
      resetTime: Date
    }
    ip?: string
  }

export type RateLimitResponse<Request extends RateLimitRequest = RateLimitRequest> = HasOutgoingHeaders &
  HasReq<Request> &
  HasStatus &
  HasFreshness &
  HasWriteMethods &
  Writable

export type RateLimitMiddleware<
  Req extends RateLimitRequest = RateLimitRequest,
  Res extends RateLimitResponse<Req> = RateLimitResponse<Req>
> = {
  (req: Req, res: Res, next: () => void): Promise<void>
  resetKey: (key: string) => void
}
