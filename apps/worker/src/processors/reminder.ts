/**
 * Reminder Job Processor
 *
 * Processes reminder jobs scheduled 2 hours before a booking starts.
 * Fetches the booking and logs a reminder (stub for email in future phases).
 *
 * If a booking gets cancelled between when the reminder is enqueued and
 * when it fires, we skip it gracefully — only process if still 'confirmed'.
 */

import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "../lib/prisma";
import { ReminderJobData, QUEUE_NAMES } from "@perch/shared";

export async function createReminderWorker(
  connection: Redis
): Promise<Worker<ReminderJobData>> {
  const worker = new Worker<ReminderJobData>(
    QUEUE_NAMES.REMINDERS,
    async (job: Job<ReminderJobData>) => {
      const { bookingId } = job.data;

      console.log(`[Reminder] Processing reminder for booking ${bookingId}`);

      try {
        // Fetch the booking with renter and space info
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            space: true,
            renter: true,
          },
        });

        if (!booking) {
          console.warn(
            `[Reminder] Booking not found: ${bookingId}. Skipping reminder.`
          );
          return;
        }

        // Guard: only send reminder if booking is still confirmed
        // (booking might have been cancelled after reminder was enqueued)
        if (booking.status !== "confirmed") {
          console.log(
            `[Reminder] Booking ${bookingId} is ${booking.status}, not confirmed. Skipping reminder.`
          );
          return;
        }

        // TODO: Phase 10+ — integrate with email service (Resend, Nodemailer, etc.)
        // For now, just log the reminder
        console.log(`
[Reminder] ─────────────────────────────────────────────
[Reminder] 📬 REMINDER NOTIFICATION
[Reminder] ─────────────────────────────────────────────
[Reminder] Booking ID:   ${booking.id}
[Reminder] Renter:       ${booking.renter.email}
[Reminder] Space:        ${booking.space.name}
[Reminder] Start Time:   ${booking.startTime.toISOString()}
[Reminder] End Time:     ${booking.endTime.toISOString()}
[Reminder] Amount:       ${booking.amount} paise
[Reminder] ─────────────────────────────────────────────
        `);

        return {
          success: true,
          bookingId,
          renterEmail: booking.renter.email,
          spaceName: booking.space.name,
          startTime: booking.startTime.toISOString(),
        };
      } catch (err) {
        console.error(`[Reminder] Error processing reminder: ${err}`);
        // Re-throw so BullMQ can retry if needed
        throw err;
      }
    },
    {
      connection,
      // Process one reminder at a time
      concurrency: 1,
    }
  );

  // Log worker events
  worker.on("completed", (job: Job) => {
    console.log(`[Reminder] ✓ Reminder job completed: ${job.id}`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`[Reminder] ✗ Reminder job failed: ${job?.id} — ${err.message}`);
  });

  return worker;
}
