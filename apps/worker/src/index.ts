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
import { createNoShowSweepWorker, enqueueNoShowSweep } from './processors/noShowSweep'
import redis from './lib/redis'

console.log('[Worker] Initializing Perch background worker...')

console.log(`[Worker] Reminder queue: ${reminderQueue.name}`)
console.log(`[Worker] No-show queue: ${noShowQueue.name}`)

// Keep track of workers for cleanup
let reminderWorkerInstance: any = null
let noShowWorkerInstance: any = null

// Initialize processors
async function initializeWorkers() {
  try {
    reminderWorkerInstance = await createReminderWorker(redis)
    console.log('[Worker] ✓ Reminder worker initialized')
  } catch (err) {
    console.error('[Worker] Failed to initialize reminder worker:', err)
    process.exit(1)
  }

  try {
    // Enqueue the recurring no-show sweep job
    await enqueueNoShowSweep(redis)
    console.log('[Worker] ✓ No-show sweep job enqueued')
  } catch (err) {
    console.error('[Worker] Failed to enqueue no-show sweep:', err)
    process.exit(1)
  }

  try {
    // Initialize the no-show sweep worker
    noShowWorkerInstance = await createNoShowSweepWorker(redis)
    console.log('[Worker] ✓ No-show sweep worker initialized')
  } catch (err) {
    console.error('[Worker] Failed to initialize no-show sweep worker:', err)
    process.exit(1)
  }
}

initializeWorkers()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...')
  
  if (reminderWorkerInstance) await reminderWorkerInstance.close()
  if (noShowWorkerInstance) await noShowWorkerInstance.close()
  
  await reminderQueue.close()
  await noShowQueue.close()
  
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down...')
  
  if (reminderWorkerInstance) await reminderWorkerInstance.close()
  if (noShowWorkerInstance) await noShowWorkerInstance.close()
  
  await reminderQueue.close()
  await noShowQueue.close()
  
  process.exit(0)
})
