import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { searchUsers } from "../controllers/userController.js";

const router = express.Router();

router.get('/search', authRequired, searchUsers);

export default router;

