import { z } from "zod";

export const createSpaceSchema = z.object({
  orgId: z.string().uuid("Organization ID must be a valid UUID"),
  name: z.string().min(1, "Space name is required").max(255, "Space name must be less than 255 characters"),
  type: z.enum(["podcast", "photography", "gaming"]),
  hourlyRate: z.number().int("Hourly rate must be an integer").positive("Hourly rate must be positive"),
  depositRate: z.number().int("Deposit rate must be an integer").nonnegative("Deposit rate must be non-negative"),
  capacity: z.number().int("Capacity must be an integer").positive("Capacity must be at least 1"),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
});

export const updateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(255, "Space name must be less than 255 characters").optional(),
  type: z.enum(["podcast", "photography", "gaming"]).optional(),
  hourlyRate: z.number().int("Hourly rate must be an integer").positive("Hourly rate must be positive").optional(),
  depositRate: z.number().int("Deposit rate must be an integer").nonnegative("Deposit rate must be non-negative").optional(),
  capacity: z.number().int("Capacity must be an integer").positive("Capacity must be at least 1").optional(),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
}).strict();

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type SpaceType = z.infer<typeof createSpaceSchema>["type"];
