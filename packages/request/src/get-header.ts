import type { HasHeaders, Headers } from "./types"

export function getRequestHeader<HeaderName extends string>(
  req: HasHeaders,
  headerName: HeaderName,
): Headers[Lowercase<HeaderName>] {
  switch (headerName) {
    case "referer":
    case "referrer": {
      return req.headers.referer || (req.headers.referrer as string | undefined)
    }
    case "if-range": {
      const header = req.headers["if-range"]
      if (Array.isArray(header)) return header.join(", ")
      return header
    }
    default: {
      return req.headers[headerName]
    }
  }
}
