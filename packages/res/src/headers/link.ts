import { encodeUrl } from '@otterhttp/encode-url'
import type { HasOutgoingHeaders } from '../types'

function formatLink([rel, link]: [string, string | URL]) {
  const encodedLink = link instanceof URL ? link.href : encodeUrl(link)
  return `<${encodedLink}>; rel="${rel}"`
}

export function setResponseLinkHeader(res: HasOutgoingHeaders, links: Record<string, URL | string>) {
  res.appendHeader('link', Object.entries(links).map(formatLink))
}
