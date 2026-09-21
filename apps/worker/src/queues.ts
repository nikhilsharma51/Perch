import redis from './lib/redis'
import { createReminderQueue, createNoShowQueue } from '@perch/shared'

export const reminderQueue = createReminderQueue(redis)
export const noShowQueue = createNoShowQueue(redis)
