import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();

const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL?.trim(), // optional, e.g. http://localhost:3000
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.options("*", cors());

app.use(express.json());
// Serve uploaded images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/auctions", auctionRoutes);
app.use("/messages", messageRoutes);
app.use("/chats", chatRoutes);
app.use("/users", userRoutes);
app.use("/export", exportRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Auction backend is running!" });
});

export default app;
