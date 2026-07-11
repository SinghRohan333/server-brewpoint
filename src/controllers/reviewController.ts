import { Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { Review } from "../types/review";
import { Product } from "../types/product";
import { User } from "../types/user";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { getIdParam } from "../utils/getIdParam";

const recalculateProductRating = async (productId: ObjectId) => {
  const reviews = getDB().collection<Review>("reviews");
  const products = getDB().collection<Product>("products");

  const stats = await reviews
    .aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const avgRating = stats[0]?.avgRating || 0;
  const reviewCount = stats[0]?.count || 0;

  await products.updateOne(
    { _id: productId },
    { $set: { rating: Math.round(avgRating * 10) / 10, reviewCount } },
  );
};

export const getReviewsForProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const productId = getIdParam(req);
    if (!ObjectId.isValid(productId))
      throw new AppError("Invalid product ID", 400);

    const reviews = getDB().collection<Review>("reviews");
    const items = await reviews
      .find({ productId: new ObjectId(productId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const productId = getIdParam(req);
    if (!ObjectId.isValid(productId))
      throw new AppError("Invalid product ID", 400);

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Rating must be between 1 and 5", 400);
    }
    if (!comment || comment.trim().length === 0) {
      throw new AppError("Comment is required", 400);
    }

    const products = getDB().collection<Product>("products");
    const product = await products.findOne({ _id: new ObjectId(productId) });
    if (!product) throw new AppError("Product not found", 404);

    const reviews = getDB().collection<Review>("reviews");
    const existing = await reviews.findOne({
      productId: new ObjectId(productId),
      userId: new ObjectId(req.user!.userId),
    });
    if (existing) {
      throw new AppError("You already reviewed this product", 409);
    }

    const users = getDB().collection<User>("users");
    const user = await users.findOne({ _id: new ObjectId(req.user!.userId) });
    if (!user) throw new AppError("User not found", 404);

    const newReview: Review = {
      productId: new ObjectId(productId),
      userId: new ObjectId(req.user!.userId),
      userName: user.name,
      rating: Number(rating),
      comment,
      createdAt: new Date(),
    };

    const result = await reviews.insertOne(newReview);
    newReview._id = result.insertedId;

    await recalculateProductRating(new ObjectId(productId));

    res.status(201).json({ success: true, data: newReview });
  } catch (error) {
    next(error);
  }
};
