import { z } from "zod";

export const inviteStaffSchema = z.object({
  orgId: z.string().uuid("Organization ID must be a valid UUID"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "staff"]),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type Role = z.infer<typeof inviteStaffSchema>["role"];
