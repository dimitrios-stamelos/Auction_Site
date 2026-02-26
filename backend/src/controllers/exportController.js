import { PrismaClient } from "@prisma/client";
import { Builder } from "xml2js";
const prisma = new PrismaClient();

export const exportAuctionsJson = async (req, res) => {
  const items = await prisma.auction.findMany({ include: { bids: true, seller: true } });
  res.json(items);
};

export const exportAuctionsXml = async (req, res) => {
  const items = await prisma.auction.findMany({ include: { bids: { include: { bidder: true } }, seller: true } });
  // Convert to eBay-like structure
  const xmlObj = {
    Items: {
      Item: items.map((a) => ({
        $: { ItemID: String(a.id) },
        Name: a.title,
        Category: a.category,
        Currently: `$${a.currentPrice.toFixed(2)}`,
        Buy_Price: a.buyPrice ? `$${a.buyPrice.toFixed(2)}` : undefined,
        First_Bid: `$${a.startPrice.toFixed(2)}`,
        Number_of_Bids: a.bids.length,
        Bids: {
          Bid: a.bids.map((b) => ({
            Bidder: {
              $: { UserID: b.bidder.username, Rating: b.bidder.rating },
              Location: b.bidder.city || "",
              Country: b.bidder.country || "",
            },
            Time: b.time.toISOString(),
            Amount: `$${b.amount.toFixed(2)}`,
          })),
        },
        Location: a.location,
        Country: a.seller.country || "",
        Started: a.startDate.toISOString(),
        Ends: a.endDate.toISOString(),
        Seller: { $: { UserID: a.seller.username, Rating: a.seller.rating } },
        Description: a.description,
      })),
    },
  };
  const builder = new Builder({ headless: true });
  const xml = builder.buildObject(xmlObj);
  res.type("application/xml").send(xml);
};

