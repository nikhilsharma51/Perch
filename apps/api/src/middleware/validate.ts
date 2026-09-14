import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validate = (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
  console.log(req.body)
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: result.error.flatten(),
    });
  }
  req.body = result.data; // replace with parsed/typed data
  next();
};