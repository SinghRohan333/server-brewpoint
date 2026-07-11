import { ObjectId } from "mongodb";

export type ProductCategory = "beans" | "equipment" | "accessories";
export type RoastLevel = "light" | "medium" | "dark";

export interface Product {
  _id?: ObjectId;
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  category: ProductCategory;
  origin?: string;
  roastLevel?: RoastLevel;
  rating: number;
  reviewCount: number;
  images: string[];
  stock: number;
  sellerId: ObjectId;
  createdAt: Date;
}
