import { ObjectId } from "mongodb";

export type UserRole = "user" | "admin";
export type AuthProvider = "local" | "google";

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  authProvider: AuthProvider;
  googleId?: string;
  createdAt: Date;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
