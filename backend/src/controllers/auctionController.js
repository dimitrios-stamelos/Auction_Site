import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";
import { geocodeLocation } from "../services/geocode.js";
import { fetchRecommendations, fetchPopular, sendInteraction } from "../services/recommenderClient.js";
const prisma = new PrismaClient();

// Multer storage for image uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
export const imagesUploader = multer({ storage });

export const listAuctions = async (req, res) => {
  const { q, category, minPrice, maxPrice, location, page, pageSize } = req.query;
  const base = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
    ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
    ...(minPrice ? { currentPrice: { gte: Number(minPrice) } } : {}),
    ...(maxPrice ? { currentPrice: { lte: Number(maxPrice) } } : {}),
    ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
  };
  const now = new Date();
  const whereActive = { ...base, endDate: { gt: now } };
  const whereEnded = { ...base, endDate: { lte: now } };

  const take = pageSize ? Number(pageSize) : undefined;
  const skip = page && pageSize ? (Number(page) - 1) * Number(pageSize) : undefined;

  if (take && skip != null) {
    const [countActive, countEnded] = await Promise.all([
      prisma.auction.count({ where: whereActive }),
      prisma.auction.count({ where: whereEnded }),
    ]);
    const total = countActive + countEnded;

    let items = [];
    // Determine how much to pull from active vs ended given skip/take
    if (skip >= countActive) {
      // All within ended segment
      const skipEnded = skip - countActive;
      const ended = await prisma.auction.findMany({ where: whereEnded, orderBy: { endDate: "asc" }, skip: skipEnded, take, include: { seller: { select: { id: true, username: true } } } });
      items = ended;
    } else if (skip + take <= countActive) {
      // Entirely within active segment
      const active = await prisma.auction.findMany({ where: whereActive, orderBy: { endDate: "asc" }, skip, take, include: { seller: { select: { id: true, username: true } } } });
      items = active;
    } else {
      // Spans both segments
      const takeActive = countActive - skip;
      const takeEnded = take - takeActive;
      const [active, ended] = await Promise.all([
        prisma.auction.findMany({ where: whereActive, orderBy: { endDate: "asc" }, skip, take: takeActive, include: { seller: { select: { id: true, username: true } } } }),
        prisma.auction.findMany({ where: whereEnded, orderBy: { endDate: "asc" }, skip: 0, take: takeEnded, include: { seller: { select: { id: true, username: true } } } }),
      ]);
      items = [...active, ...ended];
    }
    return res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  }

  // No pagination: return active first then ended
  const [active, ended] = await Promise.all([
    prisma.auction.findMany({ where: whereActive, orderBy: { endDate: "asc" }, include: { seller: { select: { id: true, username: true } } } }),
    prisma.auction.findMany({ where: whereEnded, orderBy: { endDate: "asc" }, include: { seller: { select: { id: true, username: true } } } }),
  ]);
  return res.json([...active, ...ended]);
};

export const getAuction = async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.auction.findUnique({
    where: { id },
    include: {
      bids: { include: { bidder: true }, orderBy: { time: "desc" } },
      seller: { select: { id: true, username: true, email: true } },
    },
  });
  if (!item) return res.status(404).json({ message: "Not found" });

  if ((!item.latitude || !item.longitude) && item.location) {
    const coords = await geocodeLocation(item.location);
    if (coords) {
      try {
        await prisma.auction.update({
          where: { id },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
        item.latitude = coords.latitude;
        item.longitude = coords.longitude;
      } catch (error) {
        console.warn("Failed to persist geocode result", error);
      }
    }
  }

  // If auction has ended and was won by a user, restrict details to winner, seller, or admin
  const now = new Date();
  const ended = now > item.endDate;
  const hasBids = item.bids && item.bids.length > 0;
  if (ended && hasBids) {
    const top = item.bids.reduce((acc, b) => (acc == null || b.amount > acc.amount ? b : acc), null);
    const winnerId = top?.bidderId;
    const user = req.user; // may be undefined for public route
    const isSeller = user && user.id === item.sellerId;
    const isAdmin = user && user.role === "ADMIN";
    const isWinner = user && user.id === winnerId;
    if (!(isSeller || isAdmin || isWinner)) {
      return res.status(403).json({ message: "Auction won; only seller or winner may view details" });
    }
  }

  res.json(item);
};

export const myAuctions = async (req, res) => {
  const items = await prisma.auction.findMany({ where: { sellerId: req.user.id }, orderBy: { endDate: "asc" }, include: { seller: { select: { id: true, username: true } } } });
  res.json(items);
};

export const myBids = async (req, res) => {
  const auctions = await prisma.auction.findMany({
    where: { bids: { some: { bidderId: req.user.id } } },
    orderBy: { endDate: "asc" },
    include: {
      seller: { select: { id: true, username: true, email: true } },
      bids: { orderBy: { amount: "desc" }, take: 1, select: { bidderId: true, amount: true } },
    },
  });
  const items = auctions.map((a) => {
    const top = a.bids?.[0];
    const { bids, ...rest } = a;
    return { ...rest, isWinningForMe: top ? top.bidderId === req.user.id : false };
  });
  res.json(items);
};

export const createAuction = async (req, res) => {
  const sellerId = req.user.id;
  const { title, description, category, startPrice, buyPrice, startDate, endDate, location, latitude, longitude, images = [] } = req.body;
  // Basic validations
  if (!title || !startPrice || !startDate || !endDate)
    return res.status(400).json({ message: "Missing required fields" });
  const sp = Number(startPrice);
  const bp = buyPrice != null ? Number(buyPrice) : null;
  if (!(sp > 0)) return res.status(400).json({ message: "Start price must be positive" });
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  if (!(eDate > sDate)) return res.status(400).json({ message: "End date must be after start date" });
  if (bp != null && !(bp >= sp)) return res.status(400).json({ message: "Buy price must be >= start price" });
  let latNum = latitude ? Number(latitude) : null;
  let lonNum = longitude ? Number(longitude) : null;
  if ((latNum == null || Number.isNaN(latNum) || lonNum == null || Number.isNaN(lonNum)) && location) {
    const coords = await geocodeLocation(location);
    if (coords) {
      latNum = coords.latitude;
      lonNum = coords.longitude;
    }
  }

  const created = await prisma.auction.create({
    data: {
      title,
      description,
      category,
      startPrice: sp,
      buyPrice: bp,
      currentPrice: sp,
      startDate: sDate,
      endDate: eDate,
      location,
      latitude: latNum,
      longitude: lonNum,
      images,
      sellerId,
    },
  });
  res.status(201).json(created);
};

export const uploadImages = async (req, res) => {
  const id = Number(req.params.id);
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) return res.status(404).json({ message: "Not found" });
  if (auction.sellerId !== req.user.id && req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  const files = (req.files || []).map((f) => `/uploads/${path.basename(f.path)}`);
  const updated = await prisma.auction.update({ where: { id }, data: { images: { push: files } } });
  res.json(updated);
};

export const updateAuction = async (req, res) => {
  const id = Number(req.params.id);
  const auction = await prisma.auction.findUnique({ where: { id }, include: { bids: true } });
  if (!auction) return res.status(404).json({ message: "Not found" });
  if (auction.sellerId !== req.user.id && req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  // Allow edit only until the first bid is placed
  if (auction.bids.length > 0) return res.status(400).json({ message: "Cannot edit after first bid" });
  // And not after auction end
  if (new Date() >= auction.endDate) return res.status(400).json({ message: "Cannot edit after auction ends" });
  const data = req.body;
  if (data.startPrice != null && !(Number(data.startPrice) > 0)) return res.status(400).json({ message: "Start price must be positive" });
  if (data.buyPrice != null && data.startPrice != null && !(Number(data.buyPrice) >= Number(data.startPrice))) return res.status(400).json({ message: "Buy price must be >= start price" });
  const updated = await prisma.auction.update({ where: { id }, data });
  res.json(updated);
};

export const deleteAuction = async (req, res) => {
  const id = Number(req.params.id);
  const auction = await prisma.auction.findUnique({ where: { id }, include: { bids: true } });
  if (!auction) return res.status(404).json({ message: "Not found" });
  if (auction.sellerId !== req.user.id && req.user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  // Allow delete only before the first bid
  if (auction.bids.length > 0) return res.status(400).json({ message: "Cannot delete after first bid" });
  if (new Date() >= auction.endDate) return res.status(400).json({ message: "Cannot delete after auction ends" });
  await prisma.bid.deleteMany({ where: { auctionId: id } });
  await prisma.auction.delete({ where: { id } });
  res.json({ ok: true });
};

export const placeBid = async (req, res) => {
  const id = Number(req.params.id);
  const { amount } = req.body;
  const auction = await prisma.auction.findUnique({ where: { id }, include: { bids: true } });
  if (!auction) return res.status(404).json({ message: "Not found" });
  const now = new Date();
  if (now < auction.startDate || now > auction.endDate) return res.status(400).json({ message: "Auction not active" });
  const current = auction.bids.length ? Math.max(...auction.bids.map((b) => b.amount)) : auction.startPrice;
  const next = Number(amount);
  if (!(next > current)) return res.status(400).json({ message: "Bid must be higher than current" });
  const bid = await prisma.bid.create({ data: { amount: next, bidderId: req.user.id, auctionId: id } });
  await prisma.auction.update({ where: { id }, data: { currentPrice: next } });

  sendInteraction(req.user.id, id, next).catch((err) => {
    console.warn("[recommender] interaction dispatch failed", err?.message || err);
  });

  res.status(201).json(bid);
};

export const recommendations = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);

  const fallback = async () => {
    const now = new Date();
    const items = await prisma.auction.findMany({
      where: { endDate: { gt: now } },
      include: { bids: true, seller: { select: { id: true, username: true } } },
    });
    return items
      .map((a) => ({ a, score: (a.bids?.length || 0) + (a.currentPrice || 0) * 0.001 }))
      .sort((x, y) => y.score - x.score)
      .slice(0, limit)
      .map((x) => ({ ...x.a, bids: undefined }));
  };

  try {
    const recItems = await fetchRecommendations(req.user.id, limit);
    const ids = recItems.map((r) => Number(r.item_id)).filter((id) => Number.isInteger(id));

    if (!ids.length) {
      const popular = await fetchPopular(limit).catch(() => []);
      const popularIds = popular.map((r) => Number(r.item_id)).filter((id) => Number.isInteger(id));
      if (!popularIds.length) {
        return res.json(await fallback());
      }
      const popularAuctions = await prisma.auction.findMany({
        where: { id: { in: popularIds } },
        include: { seller: { select: { id: true, username: true } } },
      });
      const orderedPopular = popularIds
        .map((id) => popularAuctions.find((a) => a.id === id))
        .filter(Boolean);
      return res.json(orderedPopular);
    }

    const auctions = await prisma.auction.findMany({
      where: { id: { in: ids } },
      include: { seller: { select: { id: true, username: true } } },
    });
    const ordered = ids
      .map((id) => auctions.find((a) => a.id === id))
      .filter(Boolean);

    if (!ordered.length) {
      return res.json(await fallback());
    }

    res.json(ordered);
  } catch (error) {
    console.warn("[recommender] falling back to heuristic", error?.message || error);
    res.json(await fallback());
  }
};

// Distinct list of categories for autocomplete
export const categories = async (_req, res) => {
  const cats = await prisma.auction.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  res.json(cats.map((c) => c.category).filter(Boolean));
};
