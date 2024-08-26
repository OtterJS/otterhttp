import type { HasHeaders } from "../types"

export function isXmlHttpRequest(req: HasHeaders): boolean {
  return req.headers["x-requested-with"] === "XMLHttpRequest"
}
