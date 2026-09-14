import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user has the 'owner' role in the organization.
 * 
 * Used for sensitive operations like:
 * - Creating/updating/deleting spaces
 * - Managing staff
 * - Changing organization settings
 * 
 * MUST be used after requireOrgAccess (requires req.orgMembership)
 * 
 * Typical middleware chain:
 * [authMiddleware, requireOrgAccess, requireOwnerRole]
 */
export const requireOwnerRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const membership = req.orgMembership;

  if (!membership) {
    return res.status(403).json({
      error: "Organization membership required",
      code: "MEMBERSHIP_REQUIRED",
    });
  }

  if (membership.role !== 'owner') {
    return res.status(403).json({
      error: "Owner role required for this operation",
      code: "OWNER_ROLE_REQUIRED",
    });
  }

  next();
};
