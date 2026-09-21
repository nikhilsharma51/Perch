import Redis from 'ioredis'

/**
 * Dedicated Redis connection for BullMQ
 * 
 * CRITICAL: This is a SEPARATE connection from the locking connection (Phase 6)
 * and the pub/sub connection (Phase 7).
 * 
 * BullMQ uses BLPOP which blocks the connection. Sharing it with pub/sub or
 * locking causes:
 * - pub/sub: real-time availability updates freeze while waiting for jobs
 * - locking: slot-lock requests hang while waiting for queue messages
 * 
 * Three separate Redis connections are required:
 * 1. Locking (apps/api/src/lib/redis.ts)
 * 2. Pub/Sub (apps/api/src/lib/redisSubscriber.ts)
 * 3. BullMQ (this file, apps/worker/src/lib/redis.ts)
 */

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
})

export default redis
