import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Shared Redis connection factory
 * Creates a single connection that can be reused across the application
 */
export function createRedisConnection(): Redis {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })

  redis.on('connect', () => {
    console.log('Redis connected successfully')
  })

  redis.on('error', (error) => {
    console.error('Redis connection error:', error)
  })

  redis.on('close', () => {
    console.log('Redis connection closed')
  })

  return redis
}
