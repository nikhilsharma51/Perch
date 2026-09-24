import { Router, Request, Response } from "express";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { assertTransition } from "../lib/stateMachine";
import { redis } from "../lib/redis";
import Redis from "ioredis";
import { createReminderQueue } from "@perch/shared";

const router = Router();

const reminderQueueRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
});
const reminderQueue = createReminderQueue(reminderQueueRedis);

router.post("/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(
      `[Webhook] Signature verification failed: ${err.message}`
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] Event verified: ${event.type} (${event.id})`);

  try {
    if (event.type === "payment_intent.succeeded") {
      await handlePaymentIntentSucceeded(event);
    } else if (event.type === "payment_intent.payment_failed") {
      await handlePaymentIntentPaymentFailed(event);
    } else if (event.type === "charge.refunded") {
      await handleChargeRefunded(event);
    } else {
      console.log(`[Webhook] Ignoring event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[Webhook] Error processing event: ${err.message}`);
  }

  res.status(200).json({ received: true });
});


async function handlePaymentIntentSucceeded(event: any): Promise<void> {
  const paymentIntent = event.data.object;
  const bookingId = paymentIntent.metadata?.bookingId;
  const stripePaymentId = paymentIntent.id;

  if (!bookingId) {
    console.warn(
      `[Webhook] payment_intent.succeeded has no bookingId in metadata: ${stripePaymentId}`
    );
    return;
  }

  console.log(
    `[Webhook] Processing payment_intent.succeeded for booking ${bookingId}`
  );

  // Idempotency check: has this payment already been recorded?
  const existingPayment = await prisma.payment.findUnique({
    where: { stripePaymentId },
  });

  if (existingPayment) {
    console.log(
      `[Webhook] Payment already processed (idempotency): ${stripePaymentId}`
    );
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      space: true,
      renter: true,
    },
  });

  if (!booking) {
    console.warn(`[Webhook] Booking not found: ${bookingId}`);
    return;
  }

  try {
    assertTransition(booking.status, "confirmed");
  } catch (err: any) {
    console.warn(
      `[Webhook] Illegal transition for booking ${bookingId}: ${booking.status} → confirmed`
    );
    return;
  }

  // Update booking status + create history + create payment in a single transaction
  await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed" },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: "pending",
        toStatus: "confirmed",
        changedBy: "system",
      },
    });

    await tx.payment.create({
      data: {
        bookingId,
        stripePaymentId,
        amount: paymentIntent.amount,
        type: "deposit",
        status: "succeeded",
      },
    });
  });

  console.log(
    `[Webhook] Booking ${bookingId} confirmed. Publishing SSE event...`
  );

  try {
    const message = JSON.stringify({
      spaceId: booking.spaceId,
      date: booking.startTime.toDateString(),
      type: "booking_confirmed",
    });
    await redis.publish(`availability:${booking.spaceId}`, message);
  } catch (err: any) {
    console.error(`[Webhook] Failed to publish SSE event: ${err.message}`);
  }

  // Enqueue reminder job (outside transaction, separate from booking confirmation)
  // Reminder fires 2 hours before booking start time
  try {
    const reminderTime = new Date(
      booking.startTime.getTime() - 2 * 60 * 60 * 1000
    );
    const delayMs = reminderTime.getTime() - Date.now();

    if (delayMs > 0) {
      await reminderQueue.add(
        "send-reminder",
        { bookingId },
        {
          delay: delayMs,
          removeOnComplete: true,
        }
      );
      console.log(
        `[Webhook] Reminder scheduled for booking ${bookingId} at ${reminderTime.toISOString()}`
      );
    } else {
      console.log(
        `[Webhook] Booking ${bookingId} starts in the past or less than 2 hours away; skipping reminder`
      );
    }
  } catch (err: any) {
    console.error(
      `[Webhook] Failed to enqueue reminder for booking ${bookingId}: ${err.message}`
    );
    // Log error but don't fail the webhook — booking is already confirmed in DB
  }
}


async function handlePaymentIntentPaymentFailed(event: any): Promise<void> {
  const paymentIntent = event.data.object;
  const bookingId = paymentIntent.metadata?.bookingId;
  const stripePaymentId = paymentIntent.id;

  if (!bookingId) {
    console.warn(
      `[Webhook] payment_intent.payment_failed has no bookingId in metadata: ${stripePaymentId}`
    );
    return;
  }

  console.log(
    `[Webhook] Payment failed for booking ${bookingId}. Leaving booking pending for retry.`
  );

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    console.warn(`[Webhook] Booking not found: ${bookingId}`);
    return;
  }

  console.log(
    `[Webhook] Booking ${bookingId} remains pending. Renter can retry payment.`
  );
}

/**
 * Handle charge.refunded event
 * 
 * When Stripe processes a refund, update the Payment record to reflect the refund status.
 * The booking is already transitioned to "cancelled" by the cancellation route.
 */
async function handleChargeRefunded(event: any): Promise<void> {
  const charge = event.data.object;
  const chargeId = charge.id;
  const paymentIntentId = charge.payment_intent;

  if (!paymentIntentId) {
    console.warn(
      `[Webhook] charge.refunded has no payment_intent: ${chargeId}`
    );
    return;
  }

  console.log(
    `[Webhook] Processing charge.refunded for payment_intent ${paymentIntentId}`
  );

  // Find the Payment record by stripePaymentId (which is the PaymentIntent ID)
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentId: paymentIntentId },
  });

  if (!payment) {
    console.warn(
      `[Webhook] Payment not found for payment_intent: ${paymentIntentId}`
    );
    return;
  }

  // Update Payment status to "refunded"
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "refunded" },
  });

  console.log(
    `[Webhook] Payment ${payment.id} marked as refunded (charge: ${chargeId})`
  );
}

export default router;
