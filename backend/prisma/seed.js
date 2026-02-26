import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to reset all data and sequences so IDs are consistent across machines.
async function resetDb() {
  // Use TRUNCATE with RESTART IDENTITY CASCADE to reset IDs and respect FKs
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Bid","Message","Auction","User","Conversation" RESTART IDENTITY CASCADE');
}

export async function seedCanonical() {
  const now = new Date();

  // Users (exact copies from provided data, including password hashes and IDs)
  const admin = await prisma.user.create({
    data: {
      id: 4,
      username: "main_admin",
      password: "$2a$10$HkRaAcxwi.SmI3BoxjCVxeCBdMbRllqVoi6JSptOAuFK2LNCSLcHW",
      email: "admin@admin.com",
      firstName: "admin",
      lastName: "admin",
      phone: "",
      address: "",
      city: "",
      country: "",
      afm: "",
      role: "ADMIN",
      approved: true,
      rating: 0,
    },
  });

  const seller = await prisma.user.create({
    data: {
      id: 7,
      username: "main_seller",
      password: "$2a$10$MykcOaub/Jbx3TtgC/uv6e0LRtaScTPaRHKq7bkn3h4IpVzCouucS",
      email: "seller@seller.com",
      firstName: "seller",
      lastName: "seller",
      phone: "",
      address: "",
      city: "",
      country: "",
      afm: "",
      role: "SELLER",
      approved: true,
      rating: 0,
    },
  });

  const visitor = await prisma.user.create({
    data: {
      id: 8,
      username: "main_visitor",
      password: "$2a$10$aoy7W6NFLkVV5W1/D2cgQOkNA9yKdBC9HxKkEq2iUqC/8we9guNNS",
      email: "visitor@visitor.com",
      firstName: "visitor",
      lastName: "visitor",
      phone: "",
      address: "",
      city: "",
      country: "",
      afm: "",
      role: "VISITOR",
      approved: true,
      rating: 0,
    },
  });

  const bidder = await prisma.user.create({
    data: {
      id: 5,
      username: "main_bidder",
      password: "$2a$10$chNpiiZoJcViB.8IEsGKsu5BFh6g1ljXmR7//RAEvLrc1zoCoi/Mi",
      email: "bidder@bidder.com",
      firstName: "bidder",
      lastName: "bidder",
      phone: "",
      address: "",
      city: "",
      country: "",
      afm: "",
      role: "BIDDER",
      approved: true,
      rating: 0,
    },
  });

  // Ensure the User ID sequence is set beyond the highest manual ID
  await prisma.$executeRawUnsafe(
    'SELECT setval(pg_get_serial_sequence(' +
      "'\"User\"','id'" +
      '), (SELECT COALESCE(MAX(id),0) FROM "User"))'
  );

  const categories = ["Electronics", "Books", "Home", "Fashion", "Sports", "Collectibles"]; 
  const locations = ["Athens", "Thessaloniki", "Patras", "Heraklion"]; 
  const gallerySets = [
    [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=960&q=80",
      "https://images.unsplash.com/photo-1472220625704-91e1462799b2?auto=format&fit=crop&w=960&q=80",
    ],
    [
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=960&q=80",
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=960&q=80",
    ],
    [
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=960&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=960&q=80",
    ],
    [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=960&q=80",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=960&q=80",
    ],
    [
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=960&q=80",
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=960&q=80",
    ],
    [
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=960&q=80",
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=960&q=80",
    ],
  ];

  // Two quick-ending auctions for demos (2m and 5m)
  const quickAuctions = await prisma.auction.createMany({
    data: [
      {
        title: "[SEED] Ends In ~2m",
        description: "Quick demo auction (2 minutes)",
        category: categories[0],
        startPrice: 10,
        buyPrice: null,
        currentPrice: 10,
        startDate: new Date(now.getTime() - 30 * 60 * 1000), // started 30m ago
        endDate: new Date(now.getTime() + 2 * 60 * 1000),
        location: locations[0],
        latitude: null,
        longitude: null,
        images: gallerySets[0],
        sellerId: seller.id,
      },
      {
        title: "[SEED] Ends In ~5m",
        description: "Quick demo auction (5 minutes)",
        category: categories[1],
        startPrice: 12,
        buyPrice: null,
        currentPrice: 12,
        startDate: new Date(now.getTime() - 30 * 60 * 1000),
        endDate: new Date(now.getTime() + 5 * 60 * 1000),
        location: locations[1],
        latitude: null,
        longitude: null,
        images: gallerySets[1],
        sellerId: seller.id,
      },
    ],
  });

  // Additional mix of auctions
  const more = [];
  for (let i = 0; i < 10; i++) {
    const startOffsetHours = -24 * (i % 3);
    const endOffsetHours = -24 + i * 8;
    const startDate = new Date(now.getTime() + startOffsetHours * 60 * 60 * 1000);
    let endDate = new Date(now.getTime() + endOffsetHours * 60 * 60 * 1000);
    if (endDate <= startDate) endDate = new Date(startDate.getTime() + 6 * 60 * 60 * 1000);
    const sp = 20 + i * 3;
    const bp = i % 3 === 0 ? sp + 40 + i : null;
    const gallery = gallerySets[i % gallerySets.length];
    more.push({
      title: `[SEED] Sample Auction #${i + 1}`,
      description: `Canonical seeded auction ${i + 1}`,
      category: categories[i % categories.length],
      startPrice: sp,
      buyPrice: bp,
      currentPrice: sp,
      startDate,
      endDate,
      location: locations[i % locations.length],
      latitude: null,
      longitude: null,
      images: gallery,
      sellerId: seller.id,
    });
  }
  await prisma.auction.createMany({ data: more });

  // Place a couple of bids so one of the quick auctions will end with a winner
  const qa = await prisma.auction.findFirst({ where: { title: { contains: "[SEED] Ends In ~5m" } } });
  if (qa) {
    await prisma.bid.create({ data: { amount: qa.startPrice + 5, bidderId: bidder.id, auctionId: qa.id } });
    await prisma.auction.update({ where: { id: qa.id }, data: { currentPrice: qa.startPrice + 5 } });
  }

  console.log(`Seed complete. Admin=${admin.email}, Seller=${seller.email}, Bidder=${bidder.email}, Visitor=${visitor.email}`);
}

export default async function main() {
  await resetDb();
  await seedCanonical();
}

// If executed directly by Prisma (`prisma db seed`), run main()
if (process.argv[1] && process.argv[1].includes("seed.js")) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
