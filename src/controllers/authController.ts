import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { User, UserResponse } from "../types/user";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const toUserResponse = (user: User): UserResponse => ({
  id: user._id!.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
    | "none"
    | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", 400);
    }
    if (password.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }

    const users = getDB().collection<User>("users");
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: User = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      authProvider: "local",
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);
    newUser._id = result.insertedId;

    const accessToken = generateAccessToken({
      userId: newUser._id.toString(),
      role: newUser.role,
    });
    const refreshToken = generateRefreshToken({
      userId: newUser._id.toString(),
      role: newUser.role,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res
      .status(201)
      .json({ success: true, accessToken, user: toUserResponse(newUser) });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const users = getDB().collection<User>("users");
    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.password) {
      throw new AppError(
        "This account uses Google Sign-In. Please continue with Google.",
        400,
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = generateAccessToken({
      userId: user._id!.toString(),
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user._id!.toString(),
      role: user.role,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res
      .status(200)
      .json({ success: true, accessToken, user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { credential } = req.body;
    if (!credential) throw new AppError("Missing Google credential", 400);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError("Invalid Google credential", 401);
    }

    const { email, name, sub: googleId } = payload;
    const users = getDB().collection<User>("users");
    let user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
      const newUser: User = {
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        role: "user",
        authProvider: "google",
        googleId,
        createdAt: new Date(),
      };
      const result = await users.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else if (!user.googleId) {
      // Existing account, same verified email — link Google without creating a duplicate
      await users.updateOne({ _id: user._id }, { $set: { googleId } });
      user = { ...user, googleId };
    }

    if (!user) {
      throw new AppError("Failed to authenticate with Google", 500);
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res
      .status(200)
      .json({ success: true, accessToken, user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError("No refresh token provided", 401);
    }

    const payload = verifyRefreshToken(token);

    const users = getDB().collection<User>("users");
    const user = await users.findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      throw new AppError("User no longer exists", 401);
    }

    const accessToken = generateAccessToken({
      userId: user._id!.toString(),
      role: user.role,
    });
    res.status(200).json({ success: true, accessToken });
  } catch (error) {
    next(new AppError("Invalid or expired refresh token", 401));
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ success: true, message: "Logged out" });
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = getDB().collection<User>("users");
    const user = await users.findOne({ _id: new ObjectId(req.user!.userId) });
    if (!user) throw new AppError("User not found", 404);
    res.status(200).json({ success: true, user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};
