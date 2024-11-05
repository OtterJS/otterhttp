import { type Trust, compile } from "@otterhttp/proxy-address"

import type { HasIpAddresses } from "../types"

export const trustRemoteAddress = ({ ips }: HasIpAddresses, trust: Trust): boolean => {
  if (typeof trust !== "function") trust = compile(trust)
  return trust(ips[0], 0)
}
