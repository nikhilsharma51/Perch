import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255, "Organization name must be less than 255 characters"),
  slug: z.string().min(1, "Organization slug is required").max(255, "Slug must be less than 255 characters").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255, "Organization name must be less than 255 characters").optional(),
  slug: z.string().min(1, "Organization slug is required").max(255, "Slug must be less than 255 characters").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
}).strict();

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
