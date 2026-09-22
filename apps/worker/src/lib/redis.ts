import Redis from 'ioredis'

/**
 * BullMQ uses BLPOP which blocks the connection. Sharing it with pub/sub or
 * locking causes:
 * - pub/sub: real-time availability updates freeze while waiting for jobs
 * - locking: slot-lock requests hang while waiting for queue messages
 */

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
})

export default redis
