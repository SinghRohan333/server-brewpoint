import { Router } from "express";
import {
  getReviewsForProduct,
  createReview,
} from "../controllers/reviewController";
import { protect } from "../middleware/auth";

const router = Router({ mergeParams: true }); // needed to access :id from the parent route

router.get("/", getReviewsForProduct);
router.post("/", protect, createReview);

export default router;
