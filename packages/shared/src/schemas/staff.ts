import { z } from "zod";

const ROLES = ["owner", "staff"] as const;

export const inviteStaffSchema = z.object({
  orgId: z.string().uuid("Organization ID must be a valid UUID"),
  email: z.string().email("Invalid email address"),
  role: z.enum(ROLES, { errorMap: () => ({ message: `Role must be one of: ${ROLES.join(", ")}` }) }),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type Role = z.infer<typeof inviteStaffSchema>["role"];
