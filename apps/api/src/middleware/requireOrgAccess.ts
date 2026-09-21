import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

/**
 * Middleware to verify user has access to the requested organization.
 * 
 * This is the critical multi-tenancy security boundary.
 * - Validates orgId from URL params (req.params.orgId)
 * - Checks if user is a member of the organization
 * - Attaches full membership info (including role) to req.orgMembership
 * 
 * MUST be used after authMiddleware (requires req.user)
 * 
 * Security: ALWAYS use req.params.orgId (validated by this middleware),
 * NEVER trust orgId from req.body (can be spoofed)
 */
export const requireOrgAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = req.params.orgId;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        error: "Organization ID is required",
        code: "MISSING_ORG_ID",
      });
    }

    const membership = await prisma.orgMembership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: "Access denied to this organization",
        code: "ORG_ACCESS_DENIED",
      });
    }

    // Attach membership to request for downstream handlers
    req.orgMembership = {
      id: membership.id,
      orgId: membership.orgId,
      userId: membership.userId,
      role: membership.role as 'owner' | 'staff',
    };

    next();
  } catch (error) {
    console.error("requireOrgAccess error:", error);
    return res.status(500).json({
      error: "Failed to verify organization access",
      code: "ORG_ACCESS_ERROR",
    });
  }
};
