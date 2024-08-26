import { type Options, type Ranges, type Result, parseRange } from "header-range-parser"
import { getRequestHeader } from "./get-header"
import type { HasHeaders } from "./types"

export function getRange(req: HasHeaders, size: number, options?: Options): Ranges | Result | undefined {
  const range = getRequestHeader(req, "range")
  if (!range) return
  return parseRange(size, range, options)
}
