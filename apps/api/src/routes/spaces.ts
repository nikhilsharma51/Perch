import { Router } from "express";
import { createSpaceSchema, updateSpaceSchema } from "@perch/shared";
import { validate } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { requireOrgAccess } from "../middleware/requireOrgAccess";
import { requireOwnerRole } from "../middleware/requireOwnerRole";
import { prisma } from "../lib/prisma";
import { getAvailableSlots } from "../lib/availability";
import { redisSubscriber } from "../lib/redisSubscriber";

const router = Router({ mergeParams: true }); // Inherit :orgId from parent router


router.get("/", authMiddleware, requireOrgAccess, async (req, res) => {
  try {
    const orgId = req.params.orgId;
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
          orgId,
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


router.get("/:spaceId", authMiddleware, requireOrgAccess, async (req, res) => {
  try {
    const { orgId, spaceId } = req.params;

    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        orgId, 
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


router.get("/:spaceId/availability", async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: "Date query parameter is required",
        code: "MISSING_DATE_PARAM",
        message: "Please provide a date in the format: ?date=2026-09-10",
      });
    }

    if (typeof date !== "string") {
      return res.status(400).json({
        error: "Date must be a string",
        code: "INVALID_DATE_PARAM",
      });
    }

   
    let parsedDate: Date;
    try {
      parsedDate = new Date(date);
      
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch {
      return res.status(400).json({
        error: "Date must be a valid ISO 8601 date string",
        code: "INVALID_DATE_FORMAT",
        message: "Example: 2026-09-10 or 2026-09-10T00:00:00Z",
      });
    }

    
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      return res.status(404).json({
        error: "Space not found",
        code: "SPACE_NOT_FOUND",
      });
    }

    const slots = await getAvailableSlots(spaceId, parsedDate);

    return res.status(200).json({
      spaceId,
      date: parsedDate.toISOString().split("T")[0],
      slots: slots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      })),
      count: slots.length,
    });
  } catch (error) {
    console.error("Get availability error:", error);
    return res.status(500).json({
      error: "Failed to fetch availability",
      code: "AVAILABILITY_ERROR",
    });
  }
});

/**
 * Server-Sent Events (SSE) stream for real-time availability updates
 *
 * GET /api/spaces/:spaceId/availability/stream (public, no auth)
 *
 * Opens a persistent HTTP connection that streams availability changes as they happen.
 * The client connects via EventSource and receives messages whenever a booking is created,
 * cancelled, or a slot state changes.
 *
 * Flow:
 * 1. Set SSE headers (Content-Type, Cache-Control, Connection)
 * 2. Call res.flushHeaders() immediately — MANDATORY. Without this, some server configs
 *    buffer the response and the client never receives the headers, leaving the connection
 *    hanging indefinitely.
 * 3. Subscribe to the Redis channel for this space
 * 4. On incoming messages, write them as `data: ${message}\n\n`
 * 5. On client disconnect (req.on('close')), unsubscribe and clean up listeners
 *
 * Important: The `redisSubscriber` connection is blocked while subscribed — we cannot
 * run other Redis commands on it. That's why we use a dedicated subscriber connection,
 * not the main app Redis client used for locking.
 */
router.get("/:spaceId/availability/stream", async (req, res) => {
  const { spaceId } = req.params;
  let clientSubscriber: any = null;

  console.log(`[SSE] New connection request for space: ${spaceId}`);

  try {
    // Verify the space exists before subscribing
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      console.log(`[SSE] Space not found: ${spaceId}`);
      return res.status(404).json({
        error: "Space not found",
        code: "SPACE_NOT_FOUND",
      });
    }

    console.log(`[SSE] Space found, setting up stream for: ${spaceId}`);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // CRITICAL: Flush headers immediately. Without this, the response is buffered
    // and the client never receives the headers, so the EventSource connection never opens.
    res.flushHeaders();
    console.log(`[SSE] Headers flushed for ${spaceId}`);

    const channel = `availability:${spaceId}`;

    // Create a NEW Redis subscriber for this client (not shared!)
    // Each client connection gets its own subscriber instance
    const Redis = require("ioredis");
    clientSubscriber = new Redis(process.env.REDIS_URL);
    console.log(`[SSE] Created Redis subscriber for ${spaceId}`);

    // Message handler — writes incoming Redis pub/sub messages to the SSE stream
    const messageHandler = (chan: string, message: string) => {
      try {
        console.log(`[SSE] Sending message to client for ${spaceId}:`, message);
        res.write(`data: ${message}\n\n`);
      } catch (err) {
        console.error(`[SSE] Failed to write to client:`, err);
      }
    };

    clientSubscriber.subscribe(channel, (err: any) => {
      if (err) {
        console.error(`[SSE] Failed to subscribe to ${channel}:`, err);
        res.status(500).end();
        return;
      }
      console.log(`[SSE] Successfully subscribed to ${channel}`);
    });

    clientSubscriber.on("message", messageHandler);

    clientSubscriber.on("error", (err: any) => {
      console.error(`[SSE] Redis subscriber error for ${spaceId}:`, err);
    });

    req.on("close", () => {
      console.log(`[SSE] Client disconnected from ${channel}`);
      if (clientSubscriber) {
        clientSubscriber.unsubscribe(channel);
        clientSubscriber.removeListener("message", messageHandler);
        clientSubscriber.quit();
      }
    });

    console.log(`[SSE] Stream setup complete for ${spaceId}, connection active`);
  } catch (error) {
    console.error("[SSE] Stream setup error:", error);
    if (clientSubscriber) {
      clientSubscriber.quit();
    }
    res.status(500).end();
  }
});


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
