import { z } from "zod";

export const inviteStaffSchema = z.object({
  // orgId is NOT required in body - it comes from URL params (req.params.orgId)
  // This prevents clients from spoofing the orgId
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "staff"]),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type Role = z.infer<typeof inviteStaffSchema>["role"];
