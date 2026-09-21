import { Router, Request, Response } from "express";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { assertTransition } from "../lib/stateMachine";
import { redis } from "../lib/redis";

const router = Router();

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

export default router;
