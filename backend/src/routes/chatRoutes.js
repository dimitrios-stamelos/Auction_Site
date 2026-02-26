import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { listChats, startChat, getMessages, sendToChat } from "../controllers/chatController.js";

const router = express.Router();

router.use(authRequired);
router.get('/', listChats);
router.post('/start', startChat);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendToChat);

export default router;

