import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined
}

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 50, 2000)
    },
  })

  client.on('connect', () => console.log('Redis connected'))
  client.on('error', (err) => console.error('Redis error:', err))
  client.on('close', () => console.log('Redis connection closed'))

  return client
}

/**
 * Singleton Redis client — reused across hot reloads in development
 * and shared across all server-side code in production.
 */
export const redis: Redis =
  globalThis.__redis ?? (globalThis.__redis = createRedisClient())

if (process.env.NODE_ENV !== 'production') {
  globalThis.__redis = redis
}
