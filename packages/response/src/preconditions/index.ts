import { ClientError, HttpStatus, NotModifiedError } from "@otterhttp/errors"
import { getRequestHeader } from "@otterhttp/request"

import type { HasIncomingHeaders, HasMethod, HasOutgoingHeaders, HasReq, HasStatus } from "../types"

import { someMatch } from "./if-match"
import { hasBeenModifiedSince } from "./if-modified-since"
import { noneMatch } from "./if-none-match"
import { rangePrecondition } from "./if-range"
import { isUnmodifiedSince } from "./if-unmodified-since"

/**
 * Checks that the provided response's associated request passes its
 * [preconditions]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-conditional-requests},
 * if it has any.
 *
 * If exclusively the `If-Range` precondition fails, the request's `Range` header will be deleted and this function
 * will terminate gracefully.
 *
 * If any other precondition fails, an error will be thrown containing the appropriate status code
 * for the response.
 *
 * @see [RFC 9110, 13.2.1 When to Evaluate]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-when-to-evaluate}
 * @see [RFC 9110, 13.2.2 Precedence of Preconditions]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-precedence-of-preconditions}
 */
export function validatePreconditions(
  res: HasOutgoingHeaders & HasStatus & HasReq<HasIncomingHeaders & HasMethod>,
): void {
  /**
   * "A server MUST ignore all received preconditions if its response to the same request without those conditions,
   * prior to processing the request content, would have been a status code other than a 2xx (Successful) or
   * 412 (Precondition failed)."
   */
  const method = res.req.method
  const status = res.statusCode
  if ((status < 200 || status >= 300) && status !== 412) return

  const current: { etag?: string | undefined; lastModified?: string | Date | undefined } = {}

  /**
   * "When [...] If-Match is present, evaluate the If-Match precondition: ..."
   */
  const ifMatch = getRequestHeader(res.req, "if-match")
  if (ifMatch != null) {
    if (!Object.hasOwnProperty.call(current, "etag")) current.etag = res.getHeader("etag")
    if (!someMatch(current.etag, ifMatch)) {
      throw new ClientError("If-Match Precondition Failed", {
        statusCode: HttpStatus.PreconditionFailed,
        code: "ERR_PRECONDITION_FAILED_IF_MATCH",
        expected: true,
      })
    }
  }

  /**
   * "When [...] If-Match is not present, and If-Unmodified-Since is present,
   * evaluate the If-Unmodified-Since precondition: ..."
   */
  const ifUnmodifiedSince = getRequestHeader(res.req, "if-unmodified-since")
  if (ifMatch == null && ifUnmodifiedSince != null) {
    if (!Object.hasOwnProperty.call(current, "lastModified")) current.lastModified = res.getHeader("last-modified")
    if (!isUnmodifiedSince(current.lastModified, ifUnmodifiedSince)) {
      throw new ClientError("If-Unmodified-Since Precondition Failed", {
        statusCode: HttpStatus.PreconditionFailed,
        code: "ERR_PRECONDITION_FAILED_IF_UNMODIFIED_SINCE",
        expected: true,
      })
    }
  }

  /**
   * "When [...] If-None-Match is present, evaluate the If-None-Match precondition: ..."
   */
  const ifNoneMatch = getRequestHeader(res.req, "if-none-match")
  if (ifNoneMatch != null) {
    if (!Object.hasOwnProperty.call(current, "etag")) current.etag = res.getHeader("etag")
    const failed = !noneMatch(current.etag, ifNoneMatch)

    if (failed && (method === "GET" || method === "HEAD")) {
      throw new NotModifiedError("If-None-Match Precondition Failed", {
        code: "ERR_PRECONDITION_FAILED_IF_NONE_MATCH",
        expected: true,
      })
    }

    if (failed) {
      throw new ClientError("If-None-Match Precondition Failed", {
        statusCode: HttpStatus.PreconditionFailed,
        code: "ERR_PRECONDITION_FAILED_IF_NONE_MATCH",
        expected: true,
      })
    }
  }

  /**
   * "When the method is GET or HEAD, If-None-Match is not present, and If-Modified-Since is present,
   * evaluate the If-Modified-Since precondition: ..."
   */
  const ifModifiedSince = getRequestHeader(res.req, "if-modified-since")
  if ((method === "GET" || method === "HEAD") && ifNoneMatch == null && ifModifiedSince != null) {
    if (!Object.hasOwnProperty.call(current, "lastModified")) current.lastModified = res.getHeader("last-modified")
    if (!hasBeenModifiedSince(current.lastModified, ifModifiedSince)) {
      throw new NotModifiedError("If-Modified-Since Precondition Failed", {
        code: "ERR_PRECONDITION_FAILED_IF_MODIFIED_SINCE",
        expected: true,
      })
    }
  }

  /**
   * "When the method is GET and both Range and If-Range are present, evaluate the
   * If-Range precondition: ..."
   */
  const range = getRequestHeader(res.req, "range")
  const ifRange = getRequestHeader(res.req, "if-range")
  if (res.req.method === "GET" && range != null && ifRange != null) {
    if (!Object.hasOwnProperty.call(current, "etag")) current.etag = res.getHeader("etag")
    if (!Object.hasOwnProperty.call(current, "lastModified")) current.lastModified = res.getHeader("last-modified")

    if (!rangePrecondition(current as Required<typeof current>, ifRange)) {
      res.req.headers.range = undefined
    }
  }

  /**
   * "Otherwise, perform the requested method and respond according to its success or failure."
   */
}

export * from "./compare-etag"
export { someMatch, isUnmodifiedSince, noneMatch, hasBeenModifiedSince, rangePrecondition }
