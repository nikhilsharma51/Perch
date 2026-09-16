import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getAvailableSlots } from "../lib/availability";
import { assertTransition } from "../lib/stateMachine";
import { authMiddleware } from "../middleware/auth";

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

/**
 * Transition a booking to a new status
 * 
 * AUTH REQUIRED — role-based permissions
 * 
 * POST /api/bookings/:bookingId/transition
 * 
 * Body: { toStatus: 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' }
 * 
 * Flow:
 * 1. Fetch booking and verify it belongs to a space owned by requesting user's org
 * 2. Check permissions based on transition and user role
 * 3. Call assertTransition() to validate state machine rules (throws 409 if illegal)
 * 4. Update booking status + write BookingStatusHistory in transaction
 * 5. Return updated booking
 * 
 * Permission Matrix:
 * - pending → cancelled: renter (own booking) or staff
 * - confirmed → checked_in: staff only
 * - confirmed → cancelled: staff only
 * - checked_in → completed: staff only or system
 * - confirmed → no_show: system only (TODO: wire up in Phase 9's worker)
 */
router.post("/:bookingId/transition", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { toStatus } = req.body;

    // Validate toStatus
    const validStatuses = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"];
    if (!toStatus || !validStatuses.includes(toStatus)) {
      return res.status(400).json({
        error: "Invalid toStatus",
        code: "INVALID_STATUS",
        message: `toStatus must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Fetch booking with related data
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

    // Check if user has access to this booking's space
    const userId = (req as any).user.userId;
    const orgId = booking.space.orgId;

    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId,
      },
    });

    const isStaff = !!membership; // Has any role in the org
    const isRenter = booking.renterUserId === userId;

    // Permission checks based on transition
    const fromStatus = booking.status;

    // pending → cancelled: renter (own booking) or staff
    if (fromStatus === "pending" && toStatus === "cancelled") {
      if (!isRenter && !isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only the renter or staff can cancel a pending booking",
        });
      }
    }
    // confirmed → checked_in: staff only
    else if (fromStatus === "confirmed" && toStatus === "checked_in") {
      if (!isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only staff can check in a booking",
        });
      }
    }
    // confirmed → cancelled: staff only
    else if (fromStatus === "confirmed" && toStatus === "cancelled") {
      if (!isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only staff can cancel a confirmed booking",
        });
      }
    }
    // checked_in → completed: staff only or system
    else if (fromStatus === "checked_in" && toStatus === "completed") {
      if (!isStaff) {
        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          message: "Only staff can complete a booking",
        });
      }
    }
    // confirmed → no_show: system only
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

    // Validate state machine transition
    try {
      assertTransition(fromStatus, toStatus);
    } catch (error: any) {
      return res.status(error.status || 409).json({
        error: error.message || "Invalid state transition",
        code: "INVALID_TRANSITION",
      });
    }

    // Update booking status and create history entry in transaction
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: toStatus },
      });

      // Create history entry
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

export default router;
