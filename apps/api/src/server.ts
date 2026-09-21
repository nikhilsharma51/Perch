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
app.use("/api/organizations", organizationRoutes);
app.use("/api/bookings", bookingsRoutes); 
app.use("/api/organizations/:orgId/spaces", spaceRoutes);
app.use("/api/organizations/:orgId/staff", staffRoutes);
app.use("/api/spaces", spaceRoutes);


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
});

app.listen(4000, () => console.log("API running on :4000"));