import { Router } from "express";
import { inviteStaffSchema } from "@perch/shared";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/requireOrgAccess";
import { requireOwnerRole } from "../middleware/requireOwnerRole";
import { prisma } from "../lib/prisma";

const router = Router({ mergeParams: true }); // Inherit :orgId from parent router


router.post(
  "/invite",
  authMiddleware,
  requireOrgAccess,
  requireOwnerRole,
  validate(inviteStaffSchema),
  async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const { email, role } = req.body;

      
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND",
          message: "User must sign up before being invited to an organization",
        });
      }

      
      const existingMembership = await prisma.orgMembership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        return res.status(409).json({
          error: "User is already a member of this organization",
          code: "ALREADY_MEMBER",
        });
      }

      // Create the membership
      const membership = await prisma.orgMembership.create({
        data: {
          orgId,
          userId: user.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: "Staff member added successfully",
        membership: {
          id: membership.id,
          role: membership.role,
          user: membership.user,
        },
      });
    } catch (error) {
      console.error("Invite staff error:", error);
      return res.status(500).json({
        error: "Failed to invite staff member",
        code: "STAFF_INVITE_ERROR",
      });
    }
  }
);


router.get("/", authMiddleware, requireOrgAccess, async (req, res) => {
  try {
    const orgId = req.params.orgId;

    const memberships = await prisma.orgMembership.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { role: "asc" },
    });

    const staff = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.user.createdAt,
    }));

    return res.status(200).json({
      staff,
      count: staff.length,
    });
  } catch (error) {
    console.error("List staff error:", error);
    return res.status(500).json({
      error: "Failed to fetch staff members",
      code: "STAFF_LIST_ERROR",
    });
  }
});


router.delete(
  "/:userId",
  authMiddleware,
  requireOrgAccess,
  requireOwnerRole,
  async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      const currentUserId = req.user!.userId;


      if (userId === currentUserId) {
        return res.status(403).json({
          error: "Cannot remove yourself from the organization",
          code: "CANNOT_REMOVE_SELF",
        });
      }


      const targetMembership = await prisma.orgMembership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId,
          },
        },
      });

      if (!targetMembership) {
        return res.status(404).json({
          error: "Staff member not found",
          code: "STAFF_NOT_FOUND",
        });
      }

      if (targetMembership.role === "owner") {
        return res.status(403).json({
          error: "Cannot remove organization owner",
          code: "CANNOT_REMOVE_OWNER",
        });
      }

      await prisma.orgMembership.delete({
        where: {
          orgId_userId: {
            orgId,
            userId,
          },
        },
      });

      return res.status(200).json({
        message: "Staff member removed successfully",
      });
    } catch (error) {
      console.error("Remove staff error:", error);
      return res.status(500).json({
        error: "Failed to remove staff member",
        code: "STAFF_REMOVE_ERROR",
      });
    }
  }
);

export default router;
