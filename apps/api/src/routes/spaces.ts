import { Router } from "express";
import { createSpaceSchema, updateSpaceSchema } from "@perch/shared";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/requireOrgAccess";
import { requireOwnerRole } from "../middleware/requireOwnerRole";
import { prisma } from "../lib/prisma";

const router = Router({ mergeParams: true }); // Inherit :orgId from parent router


router.get("/", authMiddleware, requireOrgAccess, async (req, res) => {
  try {
    const orgId = req.params.orgId;

    // CRITICAL: Always filter by orgId from params (validated by middleware)
    const spaces = await prisma.space.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      spaces,
      count: spaces.length,
    });
  } catch (error) {
    console.error("List spaces error:", error);
    return res.status(500).json({
      error: "Failed to fetch spaces",
      code: "SPACE_LIST_ERROR",
    });
  }
});

router.post(
  "/",
  authMiddleware,
  requireOrgAccess,
  requireOwnerRole,
  validate(createSpaceSchema),
  async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      const { name, type, hourlyRate, depositRate, capacity, imageUrl } = req.body;

      const space = await prisma.space.create({
        data: {
          orgId, // CRITICAL: Use validated orgId from params, never from body
          name,
          type,
          hourlyRate,
          depositRate,
          capacity,
          imageUrl,
        },
      });

      return res.status(201).json({
        message: "Space created successfully",
        space,
      });
    } catch (error) {
      console.error("Create space error:", error);
      return res.status(500).json({
        error: "Failed to create space",
        code: "SPACE_CREATE_ERROR",
      });
    }
  }
);

/**
 
 * Security: CRITICAL multi-tenancy check - verify space belongs to org
 */
router.get("/:spaceId", authMiddleware, requireOrgAccess, async (req, res) => {
  try {
    const { orgId, spaceId } = req.params;

    // CRITICAL: Query by BOTH spaceId AND orgId
    // This prevents users from accessing spaces in other organizations
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        orgId, // Multi-tenancy security boundary
      },
    });

    if (!space) {
      return res.status(404).json({
        error: "Space not found",
        code: "SPACE_NOT_FOUND",
      });
    }

    return res.status(200).json({ space });
  } catch (error) {
    console.error("Get space error:", error);
    return res.status(500).json({
      error: "Failed to fetch space",
      code: "SPACE_GET_ERROR",
    });
  }
});

/**

 * 
 * Security: Verify space belongs to org before updating
 */
router.put(
  "/:spaceId",
  authMiddleware,
  requireOrgAccess,
  requireOwnerRole,
  validate(updateSpaceSchema),
  async (req, res) => {
    try {
      const { orgId, spaceId } = req.params;
      const updates = req.body;

      const existingSpace = await prisma.space.findFirst({
        where: {
          id: spaceId,
          orgId, // Multi-tenancy check
        },
      });

      if (!existingSpace) {
        return res.status(404).json({
          error: "Space not found",
          code: "SPACE_NOT_FOUND",
        });
      }

      const space = await prisma.space.update({
        where: { id: spaceId },
        data: updates,
      });

      return res.status(200).json({
        message: "Space updated successfully",
        space,
      });
    } catch (error) {
      console.error("Update space error:", error);
      return res.status(500).json({
        error: "Failed to update space",
        code: "SPACE_UPDATE_ERROR",
      });
    }
  }
);

/**

 * Soft-delete a space (owner only)
 * 
 * Note: Returns 501 Not Implemented - deferred until we add isActive field
 * Hard delete is NOT safe (booking history depends on spaces)
 */
router.delete(
  "/:spaceId",
  authMiddleware,
  requireOrgAccess,
  requireOwnerRole,
  async (req, res) => {
    return res.status(501).json({
      error: "Space deletion not yet implemented",
      code: "NOT_IMPLEMENTED",
      message: "Soft delete will be implemented when isActive field is added to schema",
    });
  }
);

export default router;
