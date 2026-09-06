import express from "express";
import { BookingSchema } from "@perch/shared";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(4000, () => console.log("API running on :4000"));