import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Token expired or invalid" });
  }

  req.user = payload;
  next();
};