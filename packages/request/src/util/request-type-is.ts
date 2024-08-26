import { type ContentType, typeIs } from "@otterhttp/type-is"
import type { HasHeaders } from "../types"

export function requestTypeIs(req: HasHeaders, types: readonly (string | ContentType)[]) {
  return Boolean(typeIs(req.headers["content-type"], types))
}
