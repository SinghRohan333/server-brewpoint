import { Response, NextFunction, Request } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { Product } from "../types/product";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { getIdParam } from "../utils/getIdParam";

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      rating,
      sort = "newest",
      page = "1",
      limit = "12",
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
      ];
    }
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (rating) filter.rating = { $gte: Number(rating) };

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating_desc: { rating: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.newest;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const products = getDB().collection<Product>("products");

    const [items, total] = await Promise.all([
      products
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      products.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getIdParam(req);
    if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);

    const products = getDB().collection<Product>("products");
    const product = await products.findOne({ _id: new ObjectId(id) });
    if (!product) throw new AppError("Product not found", 404);

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const products = getDB().collection<Product>("products");
    const items = await products
      .find({ sellerId: new ObjectId(req.user!.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      title,
      shortDescription,
      fullDescription,
      price,
      category,
      origin,
      roastLevel,
      images,
      stock,
    } = req.body;

    if (
      !title ||
      !shortDescription ||
      !fullDescription ||
      !price ||
      !category
    ) {
      throw new AppError(
        "Title, description, price, and category are required",
        400,
      );
    }

    const validCategories = ["beans", "equipment", "accessories"];
    if (!validCategories.includes(category)) {
      throw new AppError("Invalid category", 400);
    }

    const newProduct: Product = {
      title,
      shortDescription,
      fullDescription,
      price: Number(price),
      category,
      origin: origin || undefined,
      roastLevel: roastLevel || undefined,
      rating: 0,
      reviewCount: 0,
      images: Array.isArray(images) ? images : images ? [images] : [],
      stock: Number(stock) || 0,
      sellerId: new ObjectId(req.user!.userId),
      createdAt: new Date(),
    };

    const products = getDB().collection<Product>("products");
    const result = await products.insertOne(newProduct);
    newProduct._id = result.insertedId;

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getIdParam(req);
    if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);

    const products = getDB().collection<Product>("products");
    const product = await products.findOne({ _id: new ObjectId(id) });
    if (!product) throw new AppError("Product not found", 404);

    const isOwner = product.sellerId.toString() === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new AppError("Not authorized to delete this product", 403);
    }

    await products.deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};
