import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";

const app = express();


app.use(helmet());
app.use(cors());
app.use(express.json());


app.get("/health", (_req, res) => res.json({ ok: true }));


app.use("/api/auth", authRoutes);


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
});

app.listen(4000, () => console.log("API running on :4000"));