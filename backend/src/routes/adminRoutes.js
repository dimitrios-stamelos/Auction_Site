import express from "express";
import { listUsers, approveUser, getUser, deleteUser } from "../controllers/adminController.js";
import { authRequired, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authRequired, requireRole("ADMIN"));

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id/approve", approveUser);
router.delete("/users/:id", deleteUser);

export default router;
