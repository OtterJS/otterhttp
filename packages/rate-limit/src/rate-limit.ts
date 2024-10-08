import { send } from "@otterhttp/send"

import { MemoryStore, type Store } from "./memory-store"
import type { RateLimitMiddleware, RateLimitRequest, RateLimitResponse } from "./types"

export interface RateLimitOptions<
  Req extends RateLimitRequest = RateLimitRequest,
  Res extends RateLimitResponse<Req> = RateLimitResponse<Req>,
> {
  windowMs: number
  max: number | ((req: Req, res: Res) => Promise<number>)
  message: string
  statusCode: number
  headers: boolean
  skipFailedRequests: boolean
  skipSuccessfulRequests: boolean
  draftPolliRatelimitHeaders: boolean
  keyGenerator: (req: Req) => string
  shouldSkip: (req: Req, res: Res) => boolean
  onLimitReached: (req: Req, res: Res) => void
  store?: Store
}

const defaultOptions: RateLimitOptions = {
  windowMs: 5 * 1000,
  max: 5,
  message: "Too many requests, please try again later.",
  statusCode: 429,
  headers: true,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  draftPolliRatelimitHeaders: false,
  keyGenerator: (req) => req.ip as unknown as string,
  shouldSkip: () => false,
  onLimitReached: () => {},
}

export function rateLimit<
  Req extends RateLimitRequest = RateLimitRequest,
  Res extends RateLimitResponse<Req> = RateLimitResponse<Req>,
>(options?: Partial<RateLimitOptions<Req, Res>>): RateLimitMiddleware<Req, Res> {
  const {
    shouldSkip,
    keyGenerator,
    windowMs,
    max,
    headers,
    skipFailedRequests,
    skipSuccessfulRequests,
    statusCode,
    onLimitReached,
    message,
    draftPolliRatelimitHeaders,
    ...otherOptions
  } = {
    ...defaultOptions,
    ...options,
  }
  const store = otherOptions.store || new MemoryStore(windowMs)

  const incrementStore = (key: string): Promise<{ current: number; resetTime: Date }> => {
    return new Promise((resolve, reject) => {
      store.incr(key, (error, hits, resetTime) => {
        if (error) reject(error)
        else resolve({ current: hits, resetTime })
      })
    })
  }

  async function middleware(req: Req, res: Res, next: () => void) {
    if (shouldSkip(req, res)) return next()

    const key = keyGenerator(req)

    const { current, resetTime } = await incrementStore(key)
    const maxResult = typeof max === "function" ? await max(req, res) : max

    req.rateLimit = {
      limit: maxResult,
      current: current,
      remaining: Math.max(maxResult - current, 0),
      resetTime: resetTime,
    }

    if (headers && !res.headersSent) {
      res.setHeader("X-RateLimit-Limit", maxResult)
      res.setHeader("X-RateLimit-Remaining", req.rateLimit.remaining)
      if (resetTime instanceof Date) {
        // provide the current date to help avoid issues with incorrect clocks
        res.setHeader("Date", new Date().toUTCString())
        res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime.getTime() / 1000))
      }
    }
    if (draftPolliRatelimitHeaders && !res.headersSent) {
      res.setHeader("RateLimit-Limit", maxResult)
      res.setHeader("RateLimit-Remaining", req.rateLimit.remaining)
      if (resetTime) {
        const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000)
        res.setHeader("RateLimit-Reset", Math.max(0, deltaSeconds))
      }
    }

    if (skipFailedRequests || skipSuccessfulRequests) {
      let decremented = false
      const decrementKey = () => {
        if (!decremented) {
          store.decrement(key)
          decremented = true
        }
      }

      if (skipFailedRequests) {
        res.on("finish", () => {
          if (res.statusCode >= 400) decrementKey()
        })

        res.on("close", () => {
          if (!res.writableEnded) decrementKey()
        })

        res.on("error", () => decrementKey())
      }

      if (skipSuccessfulRequests) {
        res.on("finish", () => {
          if (res.statusCode < 400) store.decrement(key)
        })
      }
    }

    if (maxResult && current === maxResult + 1) {
      onLimitReached(req, res)
    }

    if (maxResult && current > maxResult) {
      if (headers && !res.headersSent) {
        res.setHeader("Retry-After", Math.ceil(windowMs / 1000))
      }
      res.statusCode = statusCode
      send(res, message)
      return
    }

    next()
  }

  middleware.resetKey = store.resetKey.bind(store)

  return middleware
}
