import {z} from zod;

export const BookingSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  status: z.enum(["pending", "confirmed", "cancelled", "no_show"]),
});

export type Booking = z.infer<typeof BookingSchema>;