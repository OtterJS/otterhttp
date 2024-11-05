import type { IncomingMessage } from "node:http"
import ipaddr, { type IPv6, type IPv4 } from "ipaddr.js"

/**
 * Get all addresses in the request, using the `X-Forwarded-For` header.
 */
export function forwarded(req: Pick<IncomingMessage, "headers" | "socket">): Array<IPv4 | IPv6 | undefined> {
  // simple header parsing
  const proxyAddresses: (IPv4 | IPv6 | undefined)[] = parse((req.headers["x-forwarded-for"] as string) || "")
  const socketAddr = req.socket.remoteAddress != null ? ipaddr.parse(req.socket.remoteAddress) : undefined

  // return all addresses
  proxyAddresses.unshift(socketAddr)
  return proxyAddresses
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
 * Parse the X-Forwarded-For header, returning an IP address (see `ipaddr.js` {@link IPv4}, {@link IPv6}) for each entry.
 */
export function parse(header: string): (IPv4 | IPv6)[] {
  const raw = parseRaw(header)
  return raw.map(ipaddr.parse)
}

export type { IPv4, IPv6 }
