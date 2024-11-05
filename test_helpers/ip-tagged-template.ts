import assert from "node:assert/strict"
import ipaddr from "ipaddr.js"

export function ip(strings: TemplateStringsArray, ...values: unknown[]) {
  assert(strings.length === 1)
  assert(values.length === 0)

  return ipaddr.parse(strings[0])
}
