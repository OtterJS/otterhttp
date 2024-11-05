import { type IPv4, type IPv6, type Trust, allAddresses } from "@otterhttp/proxy-address"

import type { HasHeaders, HasSocket } from "./types"

export const getIPs = (req: HasHeaders & HasSocket, trust: Trust): Array<IPv4 | IPv6 | undefined> =>
  allAddresses(req, trust)
