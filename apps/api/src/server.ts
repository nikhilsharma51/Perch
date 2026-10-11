import "dotenv/config"
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import organizationRoutes from "./routes/organizations";
import spaceRoutes from "./routes/spaces";
import staffRoutes from "./routes/staff";
import bookingsRoutes from "./routes/bookings";
import webhooksRoutes from "./routes/webhooks";


const app = express();

app.use(helmet());
app.use(cors());

app.use("/api/webhooks", express.raw({ type: 'application/json' }), webhooksRoutes);

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// CRITICAL: Mount nested routes FIRST, at app level, BEFORE parent route
// This ensures specific paths match before the catch-all /:orgId
app.use("/api/organizations/:orgId/bookings", bookingsRoutes);
app.use("/api/organizations/:orgId/spaces", spaceRoutes);
app.use("/api/organizations/:orgId/staff", staffRoutes);

// Then mount the parent organizations route (which has GET /:orgId)
app.use("/api/organizations", organizationRoutes);
app.use("/api/spaces", spaceRoutes);

// 404 handler for API routes
app.use("/api", (req, res) => {
  console.error("[404] API route not found:", req.method, req.url);
  res.status(404).json({
    error: "API route not found",
    code: "NOT_FOUND",
    path: req.url,
    method: req.method,
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  console.error("Error stack:", err.stack);
  console.error("Error message:", err.message);
  console.error("Request URL:", req.url);
  console.error("Request method:", req.method);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    details: err.message,
  });
});

app.listen(4000, () => {
  console.log("=== API Server Started ===");
  console.log("Listening on :4000");
  console.log("Routes registered:");
  console.log("  POST   /api/auth/signup");
  console.log("  POST   /api/auth/login");
  console.log("  GET    /api/organizations");
  console.log("  POST   /api/organizations");
  console.log("  GET    /api/organizations/:orgId");
  console.log("  GET    /api/organizations/:orgId/bookings");
  console.log("  GET    /api/organizations/:orgId/spaces");
  console.log("  GET    /api/organizations/:orgId/staff");
  console.log("=== Ready ===\n");
});