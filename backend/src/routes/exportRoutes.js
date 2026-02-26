import express from "express";
import { exportAuctionsJson, exportAuctionsXml } from "../controllers/exportController.js";
import { authRequired, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Exports restricted to admin for now
router.get("/auctions.json", authRequired, requireRole("ADMIN"), exportAuctionsJson);
router.get("/auctions.xml", authRequired, requireRole("ADMIN"), exportAuctionsXml);

export default router;

