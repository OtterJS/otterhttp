import { hasBeenModifiedSince } from './if-modified-since'

/**
 * [RFC 9110, 13.1.4 If-Unmodified-Since]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-if-unmodified-since}
 *
 * @param currentLastModified
 * @param validatorLastModified
 */
export function isUnmodifiedSince(
  currentLastModified: Date | string | undefined,
  validatorLastModified: Date | string
) {
  return !hasBeenModifiedSince(currentLastModified, validatorLastModified)
}
