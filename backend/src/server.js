import app from "./app.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensureAdmin() {
  // If at least one ADMIN exists, do not seed another to avoid duplicates
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    console.log("Admin user already exists. Skipping seeding.");
    return;
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      email,
      password: hashed,
      firstName: "Admin",
      lastName: "User",
      approved: true,
      role: "ADMIN",
      rating: 0,
    },
  });
  console.log(`Seeded default admin ${email} / ${username}`);
}

async function ensureSampleAuctions() {
  // Only seed in non-production or when explicitly enabled
  const allowSeed = process.env.NODE_ENV !== "production" || process.env.SEED_AUCTIONS === "true";
  if (!allowSeed) return;

  // Avoid duplicates: only create if our dev-marked auctions are missing
  const devCount = await prisma.auction.count({ where: { title: { startsWith: "[DEV] " } } });
  if (devCount >= 10) {
    // Instead of skipping entirely, optionally rebase DEV auctions' times so
    // they remain meaningful relative to the current server start time.
    if (process.env.REBASE_DEV_AUCTIONS_ON_START === "false") {
      console.log(`Found ${devCount} dev auctions. Skipping dev seed.`);
      return;
    }
    await rebaseDevAuctionsToNow();
    return;
  }

  // Ensure we have a SELLER to own the auctions
  let seller = await prisma.user.findFirst({ where: { role: "SELLER", approved: true } });
  if (!seller) {
    const username = "dev_seller";
    const email = "dev_seller@example.com";
    const password = await bcrypt.hash("seller123", 10);
    seller = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        username,
        email,
        password,
        firstName: "Dev",
        lastName: "Seller",
        approved: true,
        role: "SELLER",
      },
    });
  }

  const categories = ["Electronics", "Books", "Home", "Fashion", "Sports", "Collectibles"]; 
  const locations = ["Athens", "Thessaloniki", "Patras", "Heraklion"]; 
  const now = new Date();
  const toCreate = [];
  // Add 2 auctions ending very soon (2m and 5m) for testing
  const soonStart = new Date(now.getTime() - 30 * 60 * 1000); // started 30m ago
  toCreate.push({
    title: `[DEV] Ends In ~2m`, description: `Short test auction`, category: categories[0],
    startPrice: 10, buyPrice: null, currentPrice: 10, startDate: soonStart,
    endDate: new Date(now.getTime() + 2 * 60 * 1000), location: locations[0], latitude: null, longitude: null, images: [], sellerId: seller.id,
  });
  toCreate.push({
    title: `[DEV] Ends In ~5m`, description: `Short test auction`, category: categories[1],
    startPrice: 12, buyPrice: null, currentPrice: 12, startDate: soonStart,
    endDate: new Date(now.getTime() + 5 * 60 * 1000), location: locations[1], latitude: null, longitude: null, images: [], sellerId: seller.id,
  });
  for (let i = 0; i < 12; i++) {
    const startOffsetHours = -24 * (i % 3); // some started in the past
    const endOffsetHours = -24 + i * 8; // mix past and future end dates
    const startDate = new Date(now.getTime() + startOffsetHours * 60 * 60 * 1000);
    let endDate = new Date(now.getTime() + endOffsetHours * 60 * 60 * 1000);
    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 6 * 60 * 60 * 1000); // ensure end > start by at least 6h
    }
    const sp = 10 + i * 5;
    const bp = i % 3 === 0 ? sp + 50 + i * 2 : null;

    toCreate.push({
      title: `[DEV] Sample Auction #${i + 1}`,
      description: `Development seeded sample auction number ${i + 1}.`,
      category: categories[i % categories.length],
      startPrice: sp,
      buyPrice: bp,
      currentPrice: sp,
      startDate,
      endDate,
      location: locations[i % locations.length],
      latitude: null,
      longitude: null,
      images: [],
      sellerId: seller.id,
    });
  }

  await prisma.auction.createMany({ data: toCreate });
  console.log(`Seeded ${toCreate.length} development auctions for seller #${seller.id}.`);
}

// For development: shift existing dev-marked auctions to be relative to now
// so that starting the server later doesn't leave everything already ended.
async function rebaseDevAuctionsToNow() {
  const now = new Date();
  const devAuctions = await prisma.auction.findMany({
    where: { title: { startsWith: "[DEV] " } },
    orderBy: { id: "asc" },
  });
  if (!devAuctions.length) return;

  const updates = devAuctions.map((a) => {
    const title = a.title || "";
    if (title.includes("Ends In ~2m")) {
      const startDate = new Date(now.getTime() - 30 * 60 * 1000);
      const endDate = new Date(now.getTime() + 2 * 60 * 1000);
      return prisma.auction.update({ where: { id: a.id }, data: { startDate, endDate } });
    }
    if (title.includes("Ends In ~5m")) {
      const startDate = new Date(now.getTime() - 30 * 60 * 1000);
      const endDate = new Date(now.getTime() + 5 * 60 * 1000);
      return prisma.auction.update({ where: { id: a.id }, data: { startDate, endDate } });
    }
    // Backwards-compatibility with older seeds
    if (title.includes("Ends In ~15m")) {
      const startDate = new Date(now.getTime() - 30 * 60 * 1000);
      const endDate = new Date(now.getTime() + 15 * 60 * 1000);
      return prisma.auction.update({ where: { id: a.id }, data: { startDate, endDate } });
    }

    // Preserve original duration where possible; ensure a minimum duration
    const originalDurationMs = Math.max(0, new Date(a.endDate).getTime() - new Date(a.startDate).getTime());
    const durationMs = Math.max(originalDurationMs || 0, 6 * 60 * 60 * 1000); // at least 6h
    const startDate = now; // start now to make them active immediately
    const endDate = new Date(now.getTime() + durationMs);
    return prisma.auction.update({ where: { id: a.id }, data: { startDate, endDate } });
  });

  await Promise.all(updates);
  console.log(`Rebased ${devAuctions.length} dev auctions relative to now.`);
}

const PORT = process.env.PORT || 5000;

async function boot() {
  // Optional: reset and seed canonical dataset on every start
  const canonicalSeed = process.env.CANONICAL_SEED_ON_START === "true";
  if (canonicalSeed) {
    console.warn("CANONICAL_SEED_ON_START=true -> resetting DB and seeding canonical data");
    // Dynamically import to avoid loading this unless requested
    const { default: runSeed } = await import("../prisma/seed.js");
    await runSeed();
  }

  await ensureAdmin();
  // If we've just seeded canonically, skip extra DEV seeding to keep dataset stable
  if (!canonicalSeed) {
    await ensureSampleAuctions();
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

boot().catch((e) => {
  console.error(e);
  process.exit(1);
});
