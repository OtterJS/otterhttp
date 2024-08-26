import { type Trust, compile } from "@otterhttp/proxy-address"

import type { HasSocket } from "../types"

export const trustRemoteAddress = ({ socket }: HasSocket, trust: Trust): boolean => {
  const val = socket.remoteAddress
  if (typeof trust !== "function") trust = compile(trust)
  return trust(val, 0)
}
