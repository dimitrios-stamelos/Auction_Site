import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { inbox, outbox, send, unreadCount, markRead, remove } from "../controllers/messageController.js";

const router = express.Router();

router.use(authRequired);
router.get("/inbox", inbox);
router.get("/outbox", outbox);
router.post("/", send);
router.get("/unreadCount", unreadCount);
router.patch("/:id/read", markRead);
router.delete("/:id", remove);

export default router;
