import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getAvailableSlots } from "../lib/availability";
import { assertTransition } from "../lib/stateMachine";
import { authMiddleware } from "../middleware/auth";
import { acquireSlotLock ,releaseSlotLock } from "../lib/slotLock";
import { redis } from "../lib/redis";
import { stripe } from "../lib/stripe";
const router = Router();


const createBookingSchema = z.object({
  spaceId: z.string().uuid("Space ID must be a valid UUID"),
  startTime: z.string().datetime("Start time must be a valid ISO 8601 datetime"),
  endTime: z.string().datetime("End time must be a valid ISO 8601 datetime"),
  renterEmail: z.string().email("Renter email must be a valid email address"),
});


router.post("/", async (req, res) => {
  let lockId: string | null = null;
  let parsedStartTime: Date | null = null;
  let spaceId: string | null = null;

  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten(),
      });
    }

    const { startTime, endTime, renterEmail } = result.data;
    spaceId = result.data.spaceId;

    parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (parsedEndTime <= parsedStartTime) {
      return res.status(400).json({
        error: "End time must be after start time",
        code: "INVALID_TIME_RANGE",
      });
    }

    lockId = await acquireSlotLock(spaceId, parsedStartTime);

    if (!lockId) {
      return res.status(409).json({
        error:
          "This slot is being booked right now. Please try again in a moment.",
      });
    }

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      return res.status(404).json({
        error: "Space not found",
        code: "SPACE_NOT_FOUND",
      });
    }

    const bookingDate = new Date(parsedStartTime);
    bookingDate.setUTCHours(0, 0, 0, 0);

    const availableSlots = await getAvailableSlots(spaceId, bookingDate);

    const slotIsAvailable = availableSlots.some((slot) => {
      return (
        slot.startTime.getTime() === parsedStartTime!.getTime() &&
        slot.endTime.getTime() === parsedEndTime.getTime()
      );
    });

    if (!slotIsAvailable) {
      return res.status(409).json({
        error: "Slot is no longer available",
        code: "SLOT_UNAVAILABLE",
        message: "The requested time slot has been booked or is not available",
      });
    }

    let renter = await prisma.user.findUnique({
      where: { email: renterEmail },
    });

    if (!renter) {
      renter = await prisma.user.create({
        data: {
          email: renterEmail,
          passwordHash: "", 
          name: renterEmail.split("@")[0], 
        },
      });
    }

    // Create booking and BookingStatusHistory in a TRANSACTION
    // This ensures we don't lose audit trail if one fails
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          spaceId,
          renterUserId: renter.id,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          status: "pending",
          amount: space.hourlyRate,
          depositPaid: 0,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: newBooking.id,
          fromStatus: null, // No previous status (initial creation)
          toStatus: "pending",
          changedBy: "system", // System created this initial booking
        },
      });

      return newBooking;
    });

  
    let paymentIntent: any = null;
    let clientSecret: string | null = null;

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: space.depositRate, // Amount in smallest currency unit (paise/cents)
        currency: 'inr',
        metadata: {
          bookingId: booking.id,
        },
      });
      clientSecret = paymentIntent.client_secret;
      console.log(`[Stripe] PaymentIntent created: ${paymentIntent.id} for booking ${booking.id}`);
    } catch (stripeError) {
      console.error('[Stripe] Failed to create PaymentIntent:', stripeError);

    }
    
    console.log('[SSE] Publishing booking change to Redis...');
    try {
      const message = JSON.stringify({
        spaceId: booking.spaceId,
        date: booking.startTime.toDateString(),
        type: 'booking_changed'
      });
      console.log(`[SSE] Publishing message: ${message} to channel: availability:${booking.spaceId}`);
      const numSubscribers = await redis.publish(`availability:${booking.spaceId}`, message);
      console.log(`[SSE] Message published successfully to ${numSubscribers} subscriber(s)`);
    } catch (publishError) {
      console.error('[SSE] Failed to publish booking change:', publishError);
      if (publishError instanceof Error) {
        console.error('[SSE] Publish error details:', publishError.message);
      }
    }

    return res.status(201).json({
      message: "Booking created successfully",
      booking: {
        id: booking.id,
        spaceId: booking.spaceId,
        renterUserId: booking.renterUserId,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: booking.status,
        amount: booking.amount,
        createdAt: booking.createdAt.toISOString(),
      },
      payment: {
        clientSecret: clientSecret || null,
        paymentIntentId: paymentIntent?.id || null,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return res.status(500).json({
      error: "Failed to create booking",
      code: "BOOKING_CREATE_ERROR",
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (lockId && parsedStartTime && spaceId) {
      await releaseSlotLock(spaceId, parsedStartTime, lockId);
    }
  }
});


 
router.post("/:bookingId/transition", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { toStatus } = req.body;

 
    const validStatuses = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"];
    if (!toStatus || !validStatuses.includes(toStatus)) {
      return res.status(400).json({
        error: "Invalid toStatus",
        code: "INVALID_STATUS",
        message: `toStatus must be one of: ${validStatuses.join(", ")}`,
      });
    }


    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: {
          include: {
            org: {
              include: {
                members: true,
              },
            },
          },
        },
        renter: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }

    const userId = (req as any).user.userId;
    const orgId = booking.space.orgId;

    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId,
      },
    });

    const isStaff = !!membership; 
    const isRenter = booking.renterUserId === userId;

    const fromStatus = booking.status;

  
    if (fromStatus === "pending" && toStatus === "cancelled") {
      if (!isRenter && !isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only the renter or staff can cancel a pending booking",
        });
      }
    }
   
    else if (fromStatus === "confirmed" && toStatus === "checked_in") {
      if (!isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only staff can check in a booking",
        });
      }
    }
    
    else if (fromStatus === "confirmed" && toStatus === "cancelled") {
      if (!isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only staff can cancel a confirmed booking",
        });
      }
    }
   
    else if (fromStatus === "checked_in" && toStatus === "completed") {
      if (!isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only staff can complete a booking",
        });
      }
    }
    
    // TODO: Wire this up in Phase 9's worker - this will be called by the worker, not by users
    else if (fromStatus === "confirmed" && toStatus === "no_show") {
      return res.status(403).json({
        error: "Forbidden",
        code: "FORBIDDEN",
        message: "No-show status can only be set by the system (Phase 9 worker)",
      });
    }
    // For any other transitions, just verify user has access to the org
    else {
      if (!isStaff && !isRenter) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "You don't have permission to modify this booking",
        });
      }
    }

    
    try {
      assertTransition(fromStatus, toStatus);
    } catch (error: any) {
      return res.status(error.status || 409).json({
        error: error.message || "Invalid state transition",
        code: "INVALID_TRANSITION",
      });
    }

    
    const updatedBooking = await prisma.$transaction(async (tx) => {
      
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: toStatus },
      });

      
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus,
          toStatus,
          changedBy: userId,
        },
      });

      return updated;
    });

    
    try {
      const message = JSON.stringify({
        spaceId: updatedBooking.spaceId,
        date: updatedBooking.startTime.toDateString(),
        type: 'booking_changed'
      });
      await redis.publish(`availability:${updatedBooking.spaceId}`, message);
    } catch (publishError) {
      console.error('[SSE] Failed to publish booking transition:', publishError);
      
    }

    return res.status(200).json({
      message: "Booking status updated successfully",
      booking: {
        id: updatedBooking.id,
        spaceId: updatedBooking.spaceId,
        renterUserId: updatedBooking.renterUserId,
        startTime: updatedBooking.startTime.toISOString(),
        endTime: updatedBooking.endTime.toISOString(),
        status: updatedBooking.status,
        amount: updatedBooking.amount,
        updatedAt: updatedBooking.updatedAt.toISOString(),
      },
      transition: {
        from: fromStatus,
        to: toStatus,
      },
    });
  } catch (error) {
    console.error("Transition booking error:", error);
    return res.status(500).json({
      error: "Failed to transition booking",
      code: "TRANSITION_ERROR",
    });
  }
});

/**
 * Cancel a booking with optional refund
 * 
 * POST /api/bookings/:bookingId/cancel
 * 
 * For renter: can only cancel their own bookings
 * For staff: can cancel any booking in their org
 * 
 * Refund logic:
 * - Inside refund window (< 24h before start): no refund, booking → cancelled
 * - Outside refund window (≥ 24h before start): call Stripe refund, booking → cancelled
 */
router.post("/:bookingId/cancel", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = (req as any).user.userId;

    // Fetch booking with payment info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: {
          include: {
            org: {
              include: {
                members: true,
              },
            },
          },
        },
        renter: true,
        payments: {
          where: { status: "succeeded" },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
        code: "BOOKING_NOT_FOUND",
      });
    }

    // Check permissions: renter or staff
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId: booking.space.orgId,
        userId,
      },
    });

    const isRenter = booking.renterUserId === userId;
    const isStaff = !!membership;

    if (isRenter) {
      // Renter can only cancel their own booking
      // (no additional permission check needed)
    } else if (isStaff) {
      // Staff of the org can cancel any booking
    } else {
      return res.status(403).json({
        error: "Forbidden",
        code: "FORBIDDEN",
        message: "You don't have permission to cancel this booking",
      });
    }

    // Check if booking can be cancelled (must be pending or confirmed)
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return res.status(409).json({
        error: "Cannot cancel booking in this state",
        code: "INVALID_STATE",
        message: `Booking is ${booking.status} and cannot be cancelled`,
      });
    }

    // Calculate time until booking starts
    const now = new Date();
    const timeUntilStartMs = booking.startTime.getTime() - now.getTime();
    const timeUntilStartHours = timeUntilStartMs / (1000 * 60 * 60);

    // Refund policy: 24 hours minimum before start
    // Note: This could be made per-space configurable in future phases
    const REFUND_WINDOW_HOURS = 24;
    const shouldRefund = timeUntilStartHours >= REFUND_WINDOW_HOURS;

    console.log(
      `[Cancel] Booking ${bookingId}: ${timeUntilStartHours.toFixed(1)}h until start. Refund: ${shouldRefund}`
    );

    // If there's a confirmed payment, potentially refund it
    let refundId: string | null = null;
    if (booking.payments.length > 0 && shouldRefund) {
      const successfulPayment = booking.payments[0];

      try {
        console.log(
          `[Cancel] Creating Stripe refund for payment ${successfulPayment.stripePaymentId}`
        );
        const refund = await stripe.refunds.create({
          payment_intent: successfulPayment.stripePaymentId,
        });
        refundId = refund.id;
        console.log(`[Cancel] Refund created: ${refundId}`);
      } catch (stripeErr: any) {
        console.error(
          `[Cancel] Failed to create refund: ${stripeErr.message}`
        );
        return res.status(500).json({
          error: "Failed to process refund",
          code: "REFUND_ERROR",
          details: stripeErr.message,
        });
      }
    } else if (booking.payments.length > 0 && !shouldRefund) {
      console.log(
        `[Cancel] Booking within refund window (${timeUntilStartHours.toFixed(1)}h < ${REFUND_WINDOW_HOURS}h). No refund issued.`
      );
    }

    // Update booking and create history in transaction
    const cancelledBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "cancelled" },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: "cancelled",
          changedBy: userId,
        },
      });

      // If a refund was issued, record it in the Payment (webhook will update status to 'refunded' later)
      if (refundId && booking.payments.length > 0) {
        const payment = booking.payments[0];
        // Don't update the Payment status here — wait for charge.refunded webhook
        // Just log that refund was initiated
        console.log(
          `[Cancel] Refund ${refundId} initiated for payment ${payment.stripePaymentId}`
        );
      }

      return updated;
    });

    // Publish SSE event
    try {
      const message = JSON.stringify({
        spaceId: booking.spaceId,
        date: booking.startTime.toDateString(),
        type: "booking_cancelled",
      });
      await redis.publish(`availability:${booking.spaceId}`, message);
    } catch (err: any) {
      console.error(`[Cancel] Failed to publish SSE: ${err.message}`);
    }

    res.status(200).json({
      message: "Booking cancelled successfully",
      booking: {
        id: cancelledBooking.id,
        status: cancelledBooking.status,
        startTime: cancelledBooking.startTime.toISOString(),
        endTime: cancelledBooking.endTime.toISOString(),
      },
      refund: {
        issued: shouldRefund && booking.payments.length > 0,
        refundId: refundId || null,
        reason: shouldRefund
          ? "Outside refund window"
          : "Inside refund window - no refund",
      },
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({
      error: "Failed to cancel booking",
      code: "CANCEL_ERROR",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
