import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Always fetch the latest user to reflect updated role/approval
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ message: "Invalid token" });
    if (!user.approved)
      return res.status(403).json({ message: "User not approved yet" });
    req.user = { id: user.id, role: user.role, username: user.username };
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireApproved(req, res, next) {
  // for simplicity, trust JWT and let controllers re-check if needed via DB if necessary
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// Optional auth: if a valid token is present, attach req.user; otherwise continue as guest.
export async function authOptional(req, _res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (user && user.approved) {
      req.user = { id: user.id, role: user.role, username: user.username };
    }
  } catch (_) {
    // ignore invalid tokens in optional mode
  }
  return next();
}
