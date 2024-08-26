import mime from "mime"

import type { HasOutgoingHeaders } from "../types"

export function setResponseContentTypeHeader(res: HasOutgoingHeaders, type: string): void {
  const validatedType = type.indexOf("/") === -1 ? mime.getType(type) : type
  if (validatedType == null) return
  res.setHeader("content-type", validatedType)
}
