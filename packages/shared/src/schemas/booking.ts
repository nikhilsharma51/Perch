import { z } from "zod";

const BOOKING_STATUSES = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"] as const;

export const createBookingSchema = z.object({
  spaceId: z.string().uuid("Space ID must be a valid UUID"),
  renterUserId: z.string().uuid("Renter user ID must be a valid UUID"),
  startTime: z.coerce.date().refine(date => date > new Date(), "Start time must be in the future"),
  endTime: z.coerce.date(),
  amount: z.number().int("Amount must be an integer").positive("Amount must be positive"),
}).refine(data => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export const transitionBookingSchema = z.object({
  toStatus: z.enum(BOOKING_STATUSES, { errorMap: () => ({ message: `Booking status must be one of: ${BOOKING_STATUSES.join(", ")}` }) }),
  changedBy: z.string().min(1, "ChangedBy user ID is required"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type TransitionBookingInput = z.infer<typeof transitionBookingSchema>;
export type BookingStatus = z.infer<typeof transitionBookingSchema>["toStatus"];
