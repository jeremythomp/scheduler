/**
 * Simple in-memory IP-based rate limiter.
 * Appropriate for a single-instance deployment.
 * Tracks request timestamps per IP within a sliding window.
 */

interface RateLimitStore {
  timestamps: number[]
}

const store = new Map<string, RateLimitStore>()

// Clean up stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.timestamps.length === 0 || now - entry.timestamps[entry.timestamps.length - 1] > 60_000) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAfterMs: number
}

/**
 * Checks whether a given key (typically an IP address) is within the rate limit.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - options.windowMs

  const entry = store.get(key) ?? { timestamps: [] }

  // Discard timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

  if (entry.timestamps.length >= options.limit) {
    const oldestInWindow = entry.timestamps[0]
    const resetAfterMs = oldestInWindow + options.windowMs - now
    store.set(key, entry)
    return { allowed: false, remaining: 0, resetAfterMs }
  }

  entry.timestamps.push(now)
  store.set(key, entry)

  return {
    allowed: true,
    remaining: options.limit - entry.timestamps.length,
    resetAfterMs: 0,
  }
}

/**
 * Extracts the best-effort client IP from a Request object.
 * Reads x-forwarded-for (set by Nginx/reverse proxy) and falls back
 * to x-real-ip. Both headers are only trusted because this app is
 * deployed behind a reverse proxy that sets them.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
