import express from "express";
import { authRequired, requireRole, authOptional } from "../middleware/authMiddleware.js";
import { listAuctions, getAuction, createAuction, updateAuction, deleteAuction, placeBid, myAuctions, myBids, imagesUploader, uploadImages, recommendations, categories } from "../controllers/auctionController.js";

const router = express.Router();

router.get("/", listAuctions);
router.get("/mine", authRequired, myAuctions);
router.get("/my-bids", authRequired, myBids);
router.get("/recommendations", authRequired, recommendations);
router.get("/categories", categories);
router.get("/:id", authOptional, getAuction);

// Only SELLER can create auctions
router.post("/", authRequired, requireRole("SELLER"), createAuction);
router.patch("/:id", authRequired, updateAuction);
router.delete("/:id", authRequired, deleteAuction);

router.post("/:id/bids", authRequired, requireRole("BIDDER", "ADMIN"), placeBid);
router.post("/:id/images", authRequired, imagesUploader.array("images", 8), uploadImages);

export default router;
