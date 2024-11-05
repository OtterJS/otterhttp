import assert from "node:assert/strict"
import type { IncomingMessage } from "node:http"
import ipaddr, { type IPv6, type IPv4 } from "ipaddr.js"

/**
 * Type-guard to determine whether a parsed IP address is an IPv4 address.
 */
const isIPv4 = (value: IPv4 | IPv6): value is IPv4 => value.kind() === "ipv4"
/**
 * Type-guard to determine whether a parsed IP address is an IPv6 address.
 */
const isIPv6 = (value: IPv4 | IPv6): value is IPv6 => value.kind() === "ipv6"

function parseIp(value: string): IPv4 | IPv6 {
  const ip = ipaddr.parse(value)
  if (isIPv6(ip) && ip.isIPv4MappedAddress()) return ip.toIPv4Address()
  return ip
}

/**
 * Get all addresses in the request, using the `X-Forwarded-For` header.
 */
export function* forwarded(req: Pick<IncomingMessage, "headers" | "socket">): Generator<IPv4 | IPv6 | undefined, void> {
  const socketAddress = req.socket.remoteAddress != null ? parseIp(req.socket.remoteAddress) : undefined
  yield socketAddress

  const xForwardedHeader = req.headers["x-forwarded-for"]
  if (!xForwardedHeader) return
  // https://github.com/nodejs/node/blob/58a7b0011a1858f4fde2fe553240153b39c13cd0/lib/_http_incoming.js#L381
  assert(!Array.isArray(xForwardedHeader))

  yield* parse(xForwardedHeader)
}

/**
 * Parse the X-Forwarded-For header, returning a {@link string} for each entry.
 */
export function parseRaw(header: string): string[] {
  let end = header.length
  const list: string[] = []
  let start = header.length

  // gather addresses, backwards
  for (let i = header.length - 1; i >= 0; i--) {
    switch (header.charCodeAt(i)) {
      case 0x20 /*   */:
        if (start === end) {
          start = end = i
        }
        break
      case 0x2c /* , */:
        if (start !== end) {
          list.push(header.substring(start, end))
        }
        start = end = i
        break
      default:
        start = i
        break
    }
  }

  // final address
  if (start !== end) list.push(header.substring(start, end))

  return list
}

/**
 * Parse the X-Forwarded-For header, returning an IP address (see `ipaddr.js` {@link IPv4}, {@link IPv6})
 * for each entry.
 */
export function* parse(header: string): Generator<IPv4 | IPv6, void> {
  const raw = parseRaw(header)
  for (const entry of raw) {
    yield parseIp(entry)
  }
}

export type { IPv4, IPv6 }
