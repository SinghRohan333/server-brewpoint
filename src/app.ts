import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { notFound, errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/api/auth", authRoutes);

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ success: true, message: "API is running" });
});

// Route mounts go here as we build them, e.g.:
// app.use("/api/auth", authRoutes);
// app.use("/api/products", productRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
