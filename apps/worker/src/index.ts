/**
 * Perch Background Worker
 * 
 * Processes:
 * - Reminder jobs (send email 2 hours before booking)
 * - No-show sweep (auto-transition missed confirmed bookings after 15min grace)
 */

import 'dotenv/config'
import { reminderQueue, noShowQueue } from './queues'
import { createReminderWorker } from './processors/reminder'
import redis from './lib/redis'

console.log('[Worker] Initializing Perch background worker...')

console.log(`[Worker] Reminder queue: ${reminderQueue.name}`)
console.log(`[Worker] No-show queue: ${noShowQueue.name}`)


async function initializeWorkers() {
  try {
    const reminderWorker = await createReminderWorker(redis)
    console.log('[Worker] ✓ Reminder worker initialized')
  } catch (err) {
    console.error('[Worker] Failed to initialize reminder worker:', err)
    process.exit(1)
  }
}

initializeWorkers()

// Placeholder for no-show sweep processor (Phase 9 Part 5)
console.log('[Worker] Ready for Phase 9 Part 5: No-show sweep processor')

process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...')
  await reminderQueue.close()
  await noShowQueue.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down...')
  await reminderQueue.close()
  await noShowQueue.close()
  process.exit(0)
})
