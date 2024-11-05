import type { IncomingMessage } from "node:http"
import { forwarded } from "@otterhttp/forwarded"
import ipaddr, { type IPv6, type IPv4 } from "ipaddr.js"

type Req = Pick<IncomingMessage, "headers" | "socket">

export type TrustParameter = string | number | string[]
export type TrustFunction = (addr: IPv4 | IPv6 | undefined, i: number) => boolean
export type Trust = TrustFunction | TrustParameter

type Subnet = {
  ip: IPv4 | IPv6
  range: number
}

const DIGIT_REGEXP = /^[0-9]+$/
const isIp = ipaddr.isValid
const parseIp = ipaddr.parse
/**
 * Pre-defined IP ranges.
 */
const IP_RANGES = {
  linklocal: ["169.254.0.0/16", "fe80::/10"],
  loopback: ["127.0.0.1/8", "::1/128"],
  uniquelocal: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7"],
}

/**
 * Type-guard to determine whether a string value represents a pre-defined IP range.
 *
 * @param val
 */
function isIPRangeName(val: string): val is keyof typeof IP_RANGES {
  return Object.prototype.hasOwnProperty.call(IP_RANGES, val)
}
/**
 * Type-guard to determine whether an IP address is a v4 address.
 * @param val
 */
const isIPv4 = (val: IPv4 | IPv6): val is IPv4 => val.kind() === "ipv4"
/**
 * Type-guard to determine whether an IP address is a v6 address.
 * @param val
 */
const isIPv6 = (val: IPv4 | IPv6): val is IPv6 => val.kind() === "ipv6"
/**
 * Static trust function to trust nothing.
 */
const trustNone: TrustFunction = () => false

/**
 * Get all addresses in the request, optionally stopping
 * at the first untrusted.
 *
 * @param req
 * @param trust
 */
function allAddresses(req: Req, trust?: Trust): Array<IPv4 | IPv6 | undefined> {
  // get addresses

  const addresses = forwarded(req)

  if (trust == null) return addresses

  if (typeof trust !== "function") trust = compile(trust)

  for (let i = 0; i < addresses.length - 1; i++) {
    if (trust(addresses[i], i)) continue
    addresses.length = i + 1 // https://stackoverflow.com/a/26568611
    break
  }
  return addresses
}
/**
 * Compile argument into trust function.
 *
 * @param  val
 */
function compile(val: string | number | string[]): TrustFunction {
  let trust: string[]
  if (typeof val === "string") trust = [val]
  else if (typeof val === "number") return compileHopsTrust(val)
  else if (Array.isArray(val)) trust = val.slice()
  else throw new TypeError("unsupported trust argument")

  for (let i = 0; i < trust.length; i++) {
    const element = trust[i]
    if (!isIPRangeName(element)) continue

    // Splice in pre-defined range
    const namedRange = IP_RANGES[element]
    trust.splice(i, 1, ...namedRange)
    i += namedRange.length - 1
  }
  return compileTrust(compileRangeSubnets(trust))
}
/**
 * Compile 'hops' number into trust function.
 *
 * @param hops
 */
function compileHopsTrust(hops: number): TrustFunction {
  return (_, i) => i < hops
}

/**
 * Compile `arr` elements into range subnets.
 */
function compileRangeSubnets(arr: string[]) {
  return arr.map((ip) => parseIPNotation(ip))
}
/**
 * Compile range subnet array into trust function.
 *
 * @param rangeSubnets
 */
function compileTrust(rangeSubnets: Subnet[]): TrustFunction {
  // Return optimized function based on length
  const len = rangeSubnets.length
  return len === 0 ? trustNone : len === 1 ? trustSingle(rangeSubnets[0]) : trustMulti(rangeSubnets)
}
/**
 * Parse IP notation string into range subnet.
 *
 * @param {String} note
 * @private
 */
export function parseIPNotation(note: string): Subnet {
  const pos = note.lastIndexOf("/")
  const str = pos !== -1 ? note.substring(0, pos) : note

  if (!isIp(str)) throw new TypeError(`invalid IP address: ${str}`)

  let ip = parseIp(str)
  const max = ip.kind() === "ipv6" ? 128 : 32

  if (pos === -1) {
    if (isIPv6(ip) && ip.isIPv4MappedAddress()) ip = ip.toIPv4Address()
    return { ip, range: max }
  }

  const rangeString = note.substring(pos + 1, note.length)
  let range: number | null = null

  if (DIGIT_REGEXP.test(rangeString)) range = Number.parseInt(rangeString, 10)
  else if (ip.kind() === "ipv4" && isIp(rangeString)) range = parseNetmask(rangeString)

  if (range == null || range <= 0 || range > max) throw new TypeError(`invalid range on address: ${note}`)
  return { ip, range }
}
/**
 * Parse netmask string into CIDR range.
 *
 * @param netmask
 * @private
 */
function parseNetmask(netmask: string) {
  const ip = parseIp(netmask)
  return ip.kind() === "ipv4" ? ip.prefixLengthFromSubnetMask() : null
}
/**
 * Determine address of proxied request.
 *
 * @param req
 * @param trust
 * @public
 */
function proxyAddress(req: Req, trust: Trust): IPv4 | IPv6 | undefined {
  if (trust == null) throw new TypeError("trust argument cannot be null-ish")
  const addresses = allAddresses(req, trust)

  return addresses[addresses.length - 1]
}

/**
 * Compile trust function for multiple subnets.
 */
function trustMulti(subnets: Subnet[]): TrustFunction {
  return function trust(ip: IPv4 | IPv6 | undefined) {
    if (ip == null) return false
    let ipconv: IPv4 | IPv6 | null = null
    const kind = ip.kind()
    for (let i = 0; i < subnets.length; i++) {
      const subnet = subnets[i]
      const subnetKind = subnet.ip.kind()
      let trusted = ip
      if (kind !== subnetKind) {
        if (isIPv6(ip) && !ip.isIPv4MappedAddress()) continue

        if (!ipconv) ipconv = isIPv4(ip) ? ip.toIPv4MappedAddress() : ip.toIPv4Address()

        trusted = ipconv
      }
      if (trusted.match(subnet.ip, subnet.range)) return true
    }
    return false
  }
}
/**
 * Compile trust function for single subnet.
 *
 * @param subnet
 */
function trustSingle(subnet: Subnet): TrustFunction {
  const subnetKind = subnet.ip.kind()
  const subnetIsIPv4 = subnetKind === "ipv4"
  return function trust(ip: IPv4 | IPv6 | undefined) {
    if (ip == null) return false
    const kind = ip.kind()
    if (kind !== subnetKind) {
      if (subnetIsIPv4 && !(ip as IPv6).isIPv4MappedAddress()) return false

      ip = subnetIsIPv4 ? (ip as IPv6).toIPv4Address() : (ip as IPv4).toIPv4MappedAddress()
    }
    return (ip as IPv6).match(subnet.ip, subnet.range)
  }
}

export { allAddresses, compile, proxyAddress }
export type { IPv4, IPv6 }
