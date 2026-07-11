import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined in .env");

    client = new MongoClient(uri);
    await client.connect();

    db = client.db("brewpoint-db"); // uses the DB name embedded in your connection string
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export const getDB = (): Db => {
  if (!db) throw new Error("Database not initialized. Call connectDB() first.");
  return db;
};
