import { Request } from "express";
import { AppError } from "../middleware/errorHandler";

export const getIdParam = (req: Request): string => {
  const { id } = req.params;
  const value = Array.isArray(id) ? id[0] : id;
  if (!value) throw new AppError("Missing ID parameter", 400);
  return value;
};
