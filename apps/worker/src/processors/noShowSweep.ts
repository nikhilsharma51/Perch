/**
 * No-Show Sweep Job Processor
 *
 * Recurring job that runs every 5 minutes and checks for confirmed bookings
 * that have missed their end time. Transitions them to 'no_show' state.
 *
 * Grace period: 15 minutes after booking end time.
 * (Gives staff time to mark a late no-show before system auto-marks it.)
 */

import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "../lib/prisma";
import { QUEUE_NAMES, createNoShowQueue } from "@perch/shared";

/**
 * Valid transitions for booking states
 * Copy from @perch/shared types for use in worker
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Creates the no-show sweep worker.
 *
 * This worker runs the sweep job on a recurring schedule (every 5 minutes).
 * Note: The JobScheduler handles recurring jobs, but with our approach,
 * we enqueue the recurring job once at startup and BullMQ manages re-execution.
 */
export async function createNoShowSweepWorker(
  connection: Redis
): Promise<Worker> {
  const worker = new Worker(
    QUEUE_NAMES.NO_SHOW_SWEEP,
    async (job: Job) => {
      console.log(
        `[NoShowSweep] Starting sweep at ${new Date().toISOString()}`
      );

      const graceMinutes = 15;
      const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);

      console.log(
        `[NoShowSweep] Looking for confirmed bookings with endTime < ${cutoff.toISOString()}`
      );

      // Query for all confirmed bookings past the grace period
      const missedBookings = await prisma.booking.findMany({
        where: {
          status: "confirmed",
          endTime: { lt: cutoff },
        },
        include: {
          space: true,
          renter: true,
        },
      });

      console.log(
        `[NoShowSweep] Found ${missedBookings.length} bookings to process`
      );

      // Process each booking, handling idempotency per-booking
      for (const booking of missedBookings) {
        try {
          // Idempotency check: verify the transition is legal before attempting it
          // If the booking was already transitioned to no_show by a previous sweep,
          // canTransition will return false, and we skip this booking
          if (!canTransition(booking.status, "no_show")) {
            console.log(
              `[NoShowSweep] Booking ${booking.id} cannot transition to no_show (current: ${booking.status}). Skipping.`
            );
            continue; // Skip this booking, continue with the next
          }

          // Transition booking and create history in a single transaction
          await prisma.$transaction(async (tx) => {
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: "no_show" },
            });

            await tx.bookingStatusHistory.create({
              data: {
                bookingId: booking.id,
                fromStatus: "confirmed",
                toStatus: "no_show",
                changedBy: "system",
              },
            });
          });

          console.log(`[NoShowSweep] ✓ Booking ${booking.id} marked no_show`);
        } catch (err: any) {
          // Log the error but don't stop the sweep for other bookings
          console.error(
            `[NoShowSweep] Error processing booking ${booking.id}: ${err.message}`
          );
        }
      }

      console.log(
        `[NoShowSweep] Sweep completed at ${new Date().toISOString()}`
      );
      return { processed: missedBookings.length };
    },
    {
      connection,
      // One concurrent sweep at a time (don't run overlapping sweeps)
      concurrency: 1,
    }
  );

  // Log worker events
  worker.on("completed", (job: Job) => {
    console.log(`[NoShowSweep] ✓ Sweep completed: ${job.id}`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(
      `[NoShowSweep] ✗ Sweep failed: ${job?.id} — ${err.message}`
    );
  });

  return worker;
}

/**
 * Enqueues the recurring sweep job.
 *
 * Call this once on worker startup to set up the recurring job.
 * BullMQ automatically re-enqueues it after each execution.
 */
export async function enqueueNoShowSweep(connection: Redis): Promise<void> {
  // Create queue instance to enqueue the recurring job
  const noShowQueue = createNoShowQueue(connection);

  try {
    // Enqueue the recurring sweep job
    // This runs every 5 minutes, starting immediately
    const job = await noShowQueue.add(
      "sweep",
      {}, // No data payload needed
      {
        repeat: {
          every: 5 * 60 * 1000, // 5 minutes
        },
      } as any // Type assertion needed for older bullmq versions
    );

    console.log(`[NoShowSweep] ✓ Recurring sweep job enqueued (every 5 min, jobId: ${job.id})`);

    await noShowQueue.close();
  } catch (err: any) {
    console.error(`[NoShowSweep] Failed to enqueue sweep: ${err.message}`);
    throw err;
  }
}
