import { ObjectId } from "mongodb";

export interface Review {
  _id?: ObjectId;
  productId: ObjectId;
  userId: ObjectId;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
