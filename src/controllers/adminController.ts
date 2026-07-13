import { Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { User } from "../types/user";
import { Product } from "../types/product";
import { Review } from "../types/review";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { getIdParam } from "../utils/getIdParam";

export const getStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const db = getDB();
    const [totalUsers, totalAdmins, totalProducts, totalReviews] =
      await Promise.all([
        db.collection("users").countDocuments(),
        db.collection("users").countDocuments({ role: "admin" }),
        db.collection("products").countDocuments(),
        db.collection("reviews").countDocuments(),
      ]);

    res.status(200).json({
      success: true,
      data: { totalUsers, totalAdmins, totalProducts, totalReviews },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = getDB().collection<User>("users");

    const results = await users
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "sellerId",
            as: "products",
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            role: 1,
            createdAt: 1,
            productCount: { $size: "$products" },
          },
        },
      ])
      .toArray();

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getIdParam(req);
    if (!ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
    if (id === req.user!.userId)
      throw new AppError("You cannot change your own role", 400);

    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      throw new AppError("Role must be 'user' or 'admin'", 400);
    }

    const users = getDB().collection<User>("users");
    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role } },
      { returnDocument: "after" },
    );
    if (!result) throw new AppError("User not found", 404);

    res
      .status(200)
      .json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getIdParam(req);
    if (!ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
    if (id === req.user!.userId)
      throw new AppError("You cannot delete your own account", 400);

    const db = getDB();
    const userId = new ObjectId(id);

    const user = await db.collection<User>("users").findOne({ _id: userId });
    if (!user) throw new AppError("User not found", 404);

    const userProducts = await db
      .collection<Product>("products")
      .find({ sellerId: userId })
      .toArray();
    const productIds = userProducts.map((p) => p._id!);

    // Cascade: remove their listings, reviews on those listings, and reviews they wrote elsewhere
    await Promise.all([
      db.collection<Product>("products").deleteMany({ sellerId: userId }),
      db
        .collection<Review>("reviews")
        .deleteMany({ productId: { $in: productIds } }),
      db.collection<Review>("reviews").deleteMany({ userId }),
      db.collection<User>("users").deleteOne({ _id: userId }),
    ]);

    res
      .status(200)
      .json({ success: true, message: "User and associated data deleted" });
  } catch (error) {
    next(error);
  }
};

export const getAllProductsAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const products = getDB().collection<Product>("products");

    const results = await products
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "sellerId",
            foreignField: "_id",
            as: "seller",
          },
        },
        {
          $addFields: {
            sellerName: {
              $ifNull: [{ $arrayElemAt: ["$seller.name", 0] }, "Unknown"],
            },
            sellerEmail: {
              $ifNull: [{ $arrayElemAt: ["$seller.email", 0] }, "—"],
            },
          },
        },
        { $project: { seller: 0 } },
      ])
      .toArray();

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
