import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const listUsers = async (req, res) => {
  const { q, role, approved, page, pageSize, sort = "id", dir = "asc" } = req.query;
  const where = {
    ...(q
      ? {
          OR: [
            { username: { contains: String(q), mode: "insensitive" } },
            { email: { contains: String(q), mode: "insensitive" } },
            { firstName: { contains: String(q), mode: "insensitive" } },
            { lastName: { contains: String(q), mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(approved != null ? { approved: String(approved) === "true" } : {}),
  };

  const orderByField = ["id", "username", "email", "role", "approved"].includes(String(sort)) ? String(sort) : "id";
  const orderBy = { [orderByField]: String(dir).toLowerCase() === "desc" ? "desc" : "asc" };

  const take = pageSize ? Number(pageSize) : undefined;
  const skip = page && pageSize ? (Number(page) - 1) * Number(pageSize) : undefined;

  if (take && skip != null) {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy, skip, take }),
    ]);
    const sanitized = users.map(({ password, ...u }) => u);
    return res.json({ items: sanitized, total, page: Number(page), pageSize: Number(pageSize) });
  } else {
    const users = await prisma.user.findMany({ where, orderBy });
    const sanitized = users.map(({ password, ...u }) => u);
    return res.json(sanitized);
  }
};

export const getUser = async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ message: "Not found" });
  const { password, ...u } = user;
  res.json(u);
};

export const approveUser = async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Not found" });

  // Prevent changing role of ADMIN users via API
  if (existing.role === "ADMIN" && role && role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: cannot change role of admin user" });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { approved: true, ...(role ? { role } : {}) },
  });
  const { password, ...u } = updated;
  res.json(u);
};

export const deleteUser = async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid user id" });

  // Prevent deleting yourself to avoid accidental lockout
  if (req.user?.id === id) return res.status(400).json({ message: "You cannot delete your own account" });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ message: "Not found" });

  // Safety: do not allow deleting ADMIN users
  if (user.role === "ADMIN") return res.status(403).json({ message: "Forbidden: cannot delete admin users" });

  // Also protect seeded admin by username/email even if role was somehow changed
  const protectedUsername = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const protectedEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  if (user.username.toLowerCase() === protectedUsername || user.email.toLowerCase() === protectedEmail) {
    return res.status(403).json({ message: "Forbidden: cannot delete reserved admin account" });
  }

  // Manually cascade delete related data due to restrictive FKs
  // 1) Messages sent/received by the user
  // 2) Bids placed by the user
  // 3) Bids on the user's auctions
  // 4) Auctions owned by the user
  // 5) Finally, the user
  await prisma.$transaction(async (tx) => {
    // Messages
    await tx.message.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });

    // Bids placed by the user
    await tx.bid.deleteMany({ where: { bidderId: id } });

    // Auctions owned by the user → delete bids on those auctions first
    const auctions = await tx.auction.findMany({ where: { sellerId: id }, select: { id: true } });
    const auctionIds = auctions.map((a) => a.id);
    if (auctionIds.length > 0) {
      await tx.bid.deleteMany({ where: { auctionId: { in: auctionIds } } });
      await tx.auction.deleteMany({ where: { id: { in: auctionIds } } });
    }

    // Finally delete the user
    await tx.user.delete({ where: { id } });
  });

  return res.json({ success: true });
};
