import type {
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  IncomingMessage as Request,
  ServerResponse as Response
} from 'node:http'

const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/

const compareETags = (etag: string, str: string) => str === etag || str === `W/${etag}` || `W/${str}` === etag

function noneMatch(etag: string, tagsToCompare: string) {
  let start = 0
  let end = 0

  for (let i = 0, len = tagsToCompare.length; i < len; i++) {
    switch (tagsToCompare.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) start = end = i + 1
        break
      case 0x2c /* , */:
        if (compareETags(etag, tagsToCompare.substring(start, end))) return false
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  return !compareETags(etag, tagsToCompare.substring(start, end))
}

/**
 * Check freshness of the response using request and response headers.
 *
 * @returns freshness of the response
 */
export function fresh(reqHeaders: IncomingHttpHeaders, resHeaders: OutgoingHttpHeaders) {
  const ifModifiedSince = reqHeaders['if-modified-since']
  const ifNoneMatchTags = reqHeaders['if-none-match']

  if (!ifModifiedSince && !ifNoneMatchTags) return false

  const cacheControl = reqHeaders['cache-control']
  if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) return false

  // if-none-match
  if (ifNoneMatchTags && ifNoneMatchTags !== '*') {
    const etag = resHeaders.etag

    if (!etag) return false // if the current etag is falsy, none will match, so response is stale
    if (noneMatch(etag, ifNoneMatchTags)) return false
  }

  // if-modified-since
  if (ifModifiedSince) {
    const lastModified = resHeaders['last-modified']

    if (!lastModified) return false // if we don't know when last modified, assume response is stale
    if (Date.parse(lastModified) > Date.parse(ifModifiedSince)) return false
  }

  return true
}

export const getFreshness = (
  req: Pick<Request, 'headers' | 'method'>,
  res: Pick<Response, 'getHeader' | 'statusCode'>
): boolean => {
  const method = req.method
  const status = res.statusCode

  // GET or HEAD for weak freshness.ts validation only
  if (method !== 'GET' && method !== 'HEAD') return false

  // 2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || status === 304) {
    return fresh(req.headers, {
      etag: res.getHeader('ETag') as string,
      'last-modified': res.getHeader('Last-Modified') as string
    })
  }

  return false
}
