import { someMatch } from "./if-match"

/**
 * [RFC 9110, 13.1.5 If-Range]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-if-range}
 *
 * @param current
 * @param validator
 */
export function rangePrecondition(
  current: { etag: string | undefined; lastModified: string | Date | undefined },
  validator: string,
) {
  const currentETag = current.etag
  const currentLastModified =
    current.lastModified == null || current.lastModified instanceof Date
      ? current.lastModified?.getTime()
      : Date.parse(current.lastModified)

  const currentETagUnspecified = currentETag == null || currentETag.trim() === ""
  const currentLastModifiedUnspecified = currentLastModified == null || Number.isNaN(currentLastModified)

  if (currentETagUnspecified && currentLastModifiedUnspecified) return false

  if (validator.startsWith('"') || validator.startsWith('W/"')) return someMatch(currentETag, validator)

  /**
   * as per [RFC 9110, 13.1.5 If-Range]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-if-range}
   * If the HTTP-date validator provided is not a strong validator in the sense defined by
   * section 8.8.2.2, the condition is false.
   *
   * as per [RFC 9110, 8.8.2.2 Comparison]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-comparison},
   * a 'Last-Modified' time is implicitly weak unless [...] the origin server reliably knows that the
   * associated representation did not change twice during the second covered by the presented validator.
   *
   * The otterhttp framework cannot reliably know the above, so the precondition always fails in this branch.
   */
  return false
}
