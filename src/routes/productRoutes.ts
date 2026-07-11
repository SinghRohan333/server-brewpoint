import { Router } from "express";
import {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  deleteProduct,
} from "../controllers/productController";
import { protect } from "../middleware/auth";

const router = Router();

router.get("/", getProducts);
router.get("/mine", protect, getMyProducts); // must come before /:id
router.get("/:id", getProductById);
router.post("/", protect, createProduct);
router.delete("/:id", protect, deleteProduct);

export default router;
