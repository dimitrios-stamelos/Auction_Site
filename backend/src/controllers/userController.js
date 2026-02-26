import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const searchUsers = async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const me = req.user?.id;
  if (!q) return res.json([]);
  const items = await prisma.user.findMany({
    where: {
      approved: true,
      id: me ? { not: me } : undefined,
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, email: true, role: true },
    orderBy: { username: "asc" },
    take: 10,
  });
  res.json(items);
};

