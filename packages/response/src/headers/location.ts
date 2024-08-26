import { encodeUrl } from "@otterhttp/encode-url"

import type { HasOutgoingHeaders } from "../types"

export function setResponseLocationHeader(res: HasOutgoingHeaders, url: string | URL): void {
  res.setHeader("location", url instanceof URL ? url.href : encodeUrl(url))
}
