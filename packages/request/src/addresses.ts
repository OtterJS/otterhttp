import { type Trust, allAddresses, proxyAddress } from '@otterhttp/proxy-address'

import type { HasHeaders, HasSocket } from './types'

export const getIP = (req: HasHeaders & HasSocket, trust: Trust): string | undefined =>
  proxyAddress(req, trust)?.replace(/^.*:/, '') // stripping the redundant prefix added by OS to IPv4 address

export const getIPs = (req: HasHeaders & HasSocket, trust: Trust): Array<string | undefined> => allAddresses(req, trust)
