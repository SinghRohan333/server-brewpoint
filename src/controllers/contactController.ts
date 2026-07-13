import { Request, Response, NextFunction } from "express";
import { getDB } from "../config/db";
import { ContactMessage } from "../types/contact";
import { AppError } from "../middleware/errorHandler";

export const submitContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      throw new AppError("All fields are required", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("Enter a valid email address", 400);
    }

    const newMessage: ContactMessage = {
      name,
      email,
      subject,
      message,
      createdAt: new Date(),
    };
    const messages = getDB().collection<ContactMessage>("messages");
    await messages.insertOne(newMessage);

    res.status(201).json({ success: true, message: "Message received" });
  } catch (error) {
    next(error);
  }
};
