import { Router } from "express";
import { createOrgSchema, updateOrgSchema } from "@perch/shared";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/requireOrgAccess";
import { requireOwnerRole } from "../middleware/requireOwnerRole";
import { prisma } from "../lib/prisma";

const router = Router();

/**
 * POST /api/organizations
 * Create a new organization with the creator as owner
 * 
 * Security: Transactional creation ensures org + membership are atomic
 */
router.post("/", authMiddleware, validate(createOrgSchema), async (req, res) => {
  try {
    const { name, slug } = req.body;
    const userId = req.user!.userId;

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return res.status(409).json({
        error: "Organization slug already exists",
        code: "SLUG_EXISTS",
      });
    }

    // Transactional creation: org + membership must succeed together
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, slug },
      });

      const membership = await tx.orgMembership.create({
        data: {
          orgId: org.id,
          userId,
          role: "owner",
        },
      });

      return { org, membership };
    });

    return res.status(201).json({
      message: "Organization created successfully",
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        createdAt: result.org.createdAt,
        role: result.membership.role,
      },
    });
  } catch (error) {
    console.error("Create organization error:", error);
    return res.status(500).json({
      error: "Failed to create organization",
      code: "ORG_CREATE_ERROR",
    });
  }
});

/**
 * GET /api/organizations
 * List all organizations the user is a member of
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.orgMembership.findMany({
      where: { userId },
      include: {
        org: true,
      },
    });

    const organizations = memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      createdAt: m.org.createdAt,
      role: m.role,
      membershipId: m.id,
    }));

    return res.status(200).json({
      organizations,
      count: organizations.length,
    });
  } catch (error) {
    console.error("List organizations error:", error);
    return res.status(500).json({
      error: "Failed to fetch organizations",
      code: "ORG_LIST_ERROR",
    });
  }
});

/**
 * GET /api/organizations/:orgId
 * Get a single organization (user must be a member)
 */
router.get("/:orgId", authMiddleware, requireOrgAccess, async (req, res) => {
  try {
    const orgId = req.params.orgId;

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            spaces: true,
          },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
        code: "ORG_NOT_FOUND",
      });
    }

    return res.status(200).json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        memberCount: organization._count.members,
        spaceCount: organization._count.spaces,
        role: req.orgMembership!.role,
      },
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return res.status(500).json({
      error: "Failed to fetch organization",
      code: "ORG_GET_ERROR",
    });
  }
});

/**
 * PUT /api/organizations/:orgId
 * Update organization (owner only)
 */
router.put(
  "/:orgId",
  authMiddleware,
  requireOrgAccess,
  requireOwnerRole,
  validate(updateOrgSchema),
  async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const updates = req.body;

      // If updating slug, check if it's available
      if (updates.slug) {
        const existingOrg = await prisma.organization.findUnique({
          where: { slug: updates.slug },
        });

        if (existingOrg && existingOrg.id !== orgId) {
          return res.status(409).json({
            error: "Organization slug already exists",
            code: "SLUG_EXISTS",
          });
        }
      }

      const organization = await prisma.organization.update({
        where: { id: orgId },
        data: updates,
      });

      return res.status(200).json({
        message: "Organization updated successfully",
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          createdAt: organization.createdAt,
        },
      });
    } catch (error) {
      console.error("Update organization error:", error);
      return res.status(500).json({
        error: "Failed to update organization",
        code: "ORG_UPDATE_ERROR",
      });
    }
  }
);

export default router;
