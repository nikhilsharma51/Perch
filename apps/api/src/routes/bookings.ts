import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getAvailableSlots } from "../lib/availability";

const router = Router();

/**
 * Schema for public booking creation
 * Accepts renterEmail for guest checkout (no user ID required)
 */
const createBookingSchema = z.object({
  spaceId: z.string().uuid("Space ID must be a valid UUID"),
  startTime: z.string().datetime("Start time must be a valid ISO 8601 datetime"),
  endTime: z.string().datetime("End time must be a valid ISO 8601 datetime"),
  renterEmail: z.string().email("Renter email must be a valid email address"),
});

/**
 * Create a booking (NAIVE version — no locking)
 *
 * PUBLIC route — no auth required for guest checkout
 * 
 * POST /api/bookings
 * 
 * Body: { spaceId, startTime, endTime, renterEmail }
 * 
 * Flow:
 * 1. Validate input
 * 2. Check if the space exists
 * 3. Re-run availability query to verify slot is still open
 * 4. Find or create user with renterEmail
 * 5. Create booking with status 'pending' + BookingStatusHistory in TRANSACTION
 * 6. Return the booking
 * 
 * NOTE: This is the NAIVE version — no locking is added here.
 * This deliberately allows double-booking to demonstrate the race condition in Part 6.
 */
router.post("/", async (req, res) => {
  try {
    // Validate request body
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten(),
      });
    }

    const { spaceId, startTime, endTime, renterEmail } = result.data;

    // Parse times
    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (parsedEndTime <= parsedStartTime) {
      return res.status(400).json({
        error: "End time must be after start time",
        code: "INVALID_TIME_RANGE",
      });
    }

    // Check if space exists
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      return res.status(404).json({
        error: "Space not found",
        code: "SPACE_NOT_FOUND",
      });
    }

    // STEP 1: Re-run availability query to check if slot is still open
    const bookingDate = new Date(parsedStartTime);
    bookingDate.setUTCHours(0, 0, 0, 0);

    const availableSlots = await getAvailableSlots(spaceId, bookingDate);

    // Check if the requested time slot is available
    // A slot is available if the booking fits entirely within available time
    const slotIsAvailable = availableSlots.some((slot) => {
      return (
        slot.startTime.getTime() === parsedStartTime.getTime() &&
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

    // STEP 2: Find or create user with renterEmail
    let renter = await prisma.user.findUnique({
      where: { email: renterEmail },
    });

    if (!renter) {
      renter = await prisma.user.create({
        data: {
          email: renterEmail,
          passwordHash: "", // Will be set during account creation/verification
          name: renterEmail.split("@")[0], // Use email prefix as default name
        },
      });
    }

    // STEP 3: Create booking and BookingStatusHistory in a TRANSACTION
    // This ensures we don't lose audit trail if one fails
    const booking = await prisma.$transaction(async (tx) => {
      // Create booking with 'pending' status
      const newBooking = await tx.booking.create({
        data: {
          spaceId,
          renterUserId: renter.id,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          status: "pending",
          amount: space.hourlyRate, // Use hourly rate for now (simplified)
          depositPaid: 0,
        },
      });

      // Create BookingStatusHistory record in same transaction
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
    });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({
      error: "Failed to create booking",
      code: "BOOKING_CREATE_ERROR",
    });
  }
});

export default router;
