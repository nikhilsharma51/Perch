import { Request, Response, NextFunction } from "express";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      error: "Missing authorization token",
      code: "MISSING_TOKEN",
    });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }

  req.user = payload;
  next();
};
