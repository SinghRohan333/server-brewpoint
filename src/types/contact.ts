import { ObjectId } from "mongodb";

export interface ContactMessage {
  _id?: ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}
