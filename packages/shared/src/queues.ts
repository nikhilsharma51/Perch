import { Queue } from 'bullmq'
import Redis from 'ioredis'

/**
 * BullMQ Queue Definitions
 * 
 * These queues are shared between the API (enqueuer) and the worker (processor).
 * BullMQ queues with the same name on the same Redis instance are identical.
 * 
 * CRITICAL: The Redis connection must be dedicated to BullMQ.
 * BullMQ uses BLPOP which blocks the connection; sharing with pub/sub or locking breaks those features.
 * See Phase 6 and Phase 7 landmines.
 */

/**
 * Queue names for reference
 */
export const QUEUE_NAMES = {
  REMINDERS: 'reminders',
  NO_SHOW_SWEEP: 'no-show-sweep',
} as const

/**
 * Job types
 */
export type ReminderJobData = {
  bookingId: string
}

export type NoShowJobData = {
  // sweep has no data, runs on schedule
}

/**
 * Factory functions to create queue instances
 * Both API and worker can call these with their own Redis connection
 */

export function createReminderQueue(connection: Redis): Queue<ReminderJobData> {
  return new Queue(QUEUE_NAMES.REMINDERS, { connection })
}

export function createNoShowQueue(connection: Redis): Queue<NoShowJobData> {
  return new Queue(QUEUE_NAMES.NO_SHOW_SWEEP, { connection })
}
