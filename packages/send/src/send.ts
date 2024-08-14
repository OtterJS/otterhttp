import { NotModifiedError } from '@otterhttp/errors'
import type {
  HasFreshness,
  HasIncomingHeaders,
  HasMethod,
  HasOutgoingHeaders,
  HasReq,
  HasStatus,
  HasWriteMethods
} from './types'
import { createETag, isString } from './utils'

type SendResponse = HasOutgoingHeaders &
  HasReq<HasIncomingHeaders & HasMethod> &
  HasStatus &
  HasFreshness &
  HasWriteMethods &
  NodeJS.WritableStream

function assignDefaultContentType(res: SendResponse, body: string | Buffer | null): void {
  const existingContentType = res.getHeader('content-type')
  if (existingContentType != null && typeof existingContentType === 'string') return

  if (body == null) return

  if (Buffer.isBuffer(body)) {
    res.setHeader('content-type', 'application/octet-stream')
    return
  }

  if (isString(body)) {
    res.setHeader('content-type', 'text/html')
    return
  }
}

function etagIsValid(etag: string | number | string[] | undefined): boolean {
  if (etag == null) return false
  if (Array.isArray(etag) && etag.length === 0) return false
  return true
}

function populateETag(res: SendResponse, resourceRepresentation: string | Buffer): void {
  if (resourceRepresentation == null) return
  const existingETag = res.getHeader('etag')
  if (etagIsValid(existingETag)) return

  const newETag = createETag(resourceRepresentation, 'utf-8')
  res.setHeader('etag', newETag)
}

/**
 * Sends the HTTP response.
 *
 * The body parameter can be a Buffer object, a string, an object, or an array.
 *
 * This method performs many useful tasks for simple non-streaming responses.
 * For example, it automatically assigns the Content-Length HTTP response header field (unless previously defined) and provides automatic HEAD and HTTP cache freshness support.
 *
 * @param res Response
 * @param body
 */
export function send(res: SendResponse, body: string | Buffer | null): void {
  assignDefaultContentType(res, body)

  // populate ETag
  if (body != null) populateETag(res, body)

  // freshness
  try {
    res.validatePreconditions()
  } catch (error) {
    if (error instanceof NotModifiedError) res.statusCode = 304
    else throw error
  }

  // strip irrelevant headers
  if (res.statusCode === 204 || res.statusCode === 304) {
    res.removeHeader('Content-Type')
    res.removeHeader('Content-Length')
    res.removeHeader('Transfer-Encoding')
    res.end()
    return
  }

  if (res.req.method === 'HEAD' || body == null || body === '') {
    res.end()
    return
  }

  if (Buffer.isBuffer(body)) {
    res.end(body)
    return
  }

  res.end(body, 'utf-8')
}
