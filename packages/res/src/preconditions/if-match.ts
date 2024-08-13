import { strongCompareETags } from './compare-etag'

/**
 * [RFC 9110, 13.1.1 If-Match]{@link https://datatracker.ietf.org/doc/html/rfc9110#name-if-match}
 *
 * @param currentETag
 * @param validatorETags
 */
export function someMatch(currentETag: string | undefined, validatorETags: string) {
  if (currentETag == null) return false
  if (currentETag.trim() === '') return false
  if (validatorETags === '*') return true

  let start = 0
  let end = 0

  for (let i = 0, len = validatorETags.length; i < len; i++) {
    switch (validatorETags.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) start = end = i + 1
        break
      case 0x2c /* , */:
        if (strongCompareETags(currentETag, validatorETags.substring(start, end))) return true
        start = end = i + 1
        break
      default:
        end = i + 1
        break
    }
  }

  return strongCompareETags(currentETag, validatorETags.substring(start, end))
}
