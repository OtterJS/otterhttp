import type { Trust } from "@otterhttp/proxy-address"

import { isIP } from "node:net"
import { getRequestHeader } from "./get-header"
import type { HasHeaders, HasIpAddresses, HasSocket } from "./types"
import { trustRemoteAddress } from "./util/trust-remote-address"

export type Host = {
  hostname: string
  port?: number
}

const normalizeHostString = (host: string): string => decodeURIComponent(host).toLowerCase().normalize()

const getAuthorityHeaderHostString = (req: HasHeaders): string | undefined => {
  const authority = getRequestHeader(req, ":authority")
  if (Array.isArray(authority)) return undefined
  if (authority == null) return undefined

  const index = authority.indexOf("@")
  if (index === -1) return normalizeHostString(authority)
  return normalizeHostString(authority.substring(index + 1))
}

const getForwardedHeaderHostString = (req: HasHeaders): string | undefined => {
  const forwardedHost = getRequestHeader(req, "x-forwarded-host")
  if (Array.isArray(forwardedHost)) return undefined
  if (forwardedHost == null) return undefined

  return normalizeHostString(forwardedHost)
}

const getDefaultHeaderHostString = (req: HasHeaders): string | undefined => {
  const host = getRequestHeader(req, "host")
  if (host == null) return undefined
  if (host.indexOf(",") !== -1) return undefined

  return normalizeHostString(host)
}

const getHostString = (req: HasHeaders & HasIpAddresses, trust: Trust): string | undefined => {
  if (trustRemoteAddress(req, trust)) {
    const forwardedHost = getForwardedHeaderHostString(req)
    if (forwardedHost) return forwardedHost
  }

  const authorityHost = getAuthorityHeaderHostString(req)
  const defaultHost = getDefaultHeaderHostString(req)

  if (authorityHost && defaultHost) {
    if (authorityHost !== defaultHost)
      throw new Error("Request `:authority` pseudo-header does not agree with `Host` header")
    return authorityHost
  }

  return authorityHost ?? defaultHost ?? undefined
}

export const getHost = (req: HasHeaders & HasIpAddresses, trust: Trust): Host => {
  const host = getHostString(req, trust)
  if (!host) throw new Error("Request does not include valid host information")

  // IPv6 literal support
  const index = host.indexOf(":", host[0] === "[" ? host.indexOf("]") + 1 : 0)
  if (index === -1) return { hostname: host }

  const hostname = host.substring(0, index)
  const port = Number(host.substring(index + 1))
  if (Number.isNaN(port)) throw new TypeError("Port number is NaN, therefore Host is malformed")
  return { hostname, port }
}

export const getSubdomains = ({ hostname }: Host, subdomainOffset = 2): string[] => {
  if (isIP(hostname)) return []

  const subdomains = hostname.split(".").reverse()
  subdomains.splice(0, subdomainOffset)
  return subdomains
}
