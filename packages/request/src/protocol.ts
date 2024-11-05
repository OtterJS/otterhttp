import { TLSSocket } from "node:tls"
import type { Trust } from "@otterhttp/proxy-address"

import type { HasHeaders, HasIpAddresses, HasSocket } from "./types"
import { trustRemoteAddress } from "./util/trust-remote-address"

export type Protocol = "http" | "https" | string

const hasSecureConnection = (req: HasHeaders & HasSocket): boolean => {
  return req.socket instanceof TLSSocket && req.socket.encrypted
}

export const getProtocol = (req: HasHeaders & HasSocket & HasIpAddresses, trust: Trust): Protocol => {
  const proto = `http${hasSecureConnection(req) ? "s" : ""}`

  if (!trustRemoteAddress(req, trust)) return proto

  const header = (req.headers["x-forwarded-proto"] as string) || proto

  const index = header.indexOf(",")

  return index !== -1 ? header.substring(0, index).trim() : header.trim()
}
