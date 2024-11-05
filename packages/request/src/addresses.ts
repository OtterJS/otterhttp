import { type IPv4, type IPv6, type Trust, allAddresses, proxyAddress } from "@otterhttp/proxy-address"

import type { HasHeaders, HasSocket } from "./types"

export const getIP = (req: HasHeaders & HasSocket, trust: Trust): IPv4 | IPv6 | undefined => proxyAddress(req, trust)

export const getIPs = (req: HasHeaders & HasSocket, trust: Trust): Array<IPv4 | IPv6 | undefined> =>
  allAddresses(req, trust)
