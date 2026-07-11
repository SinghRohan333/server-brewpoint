import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Not authorized, no token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(new AppError("Not authorized, invalid or expired token", 401));
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "admin") {
    return next(new AppError("Admin access required", 403));
  }
  next();
};
