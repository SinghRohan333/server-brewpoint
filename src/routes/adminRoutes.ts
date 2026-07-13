import { Router } from "express";
import { protect, requireAdmin } from "../middleware/auth";
import {
  getStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllProductsAdmin,
} from "../controllers/adminController";

const router = Router();

router.use(protect, requireAdmin); // every route below requires an authenticated admin

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);
router.get("/products", getAllProductsAdmin);

export default router;
