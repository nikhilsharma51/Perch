/**
 * Perch Background Worker
 * 
 * Processes:
 * - Reminder jobs (send email 2 hours before booking)
 * - No-show sweep (auto-transition missed confirmed bookings after 15min grace)
 */

import 'dotenv/config'
import { reminderQueue, noShowQueue } from './queues'

console.log('[Worker] Initializing Perch background worker...')

console.log(`[Worker] Reminder queue: ${reminderQueue.name}`)
console.log(`[Worker] No-show queue: ${noShowQueue.name}`)

// Placeholder until processors are implemented in Phase 9 Part 3+
console.log('[Worker] Ready for Phase 9 Part 3: Processors')

// Graceful shutdown
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
