import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function normalizePair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export const listChats = async (req, res) => {
  const me = req.user.id;
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    orderBy: { updatedAt: "desc" },
    include: {
      userA: { select: { id: true, username: true, email: true } },
      userB: { select: { id: true, username: true, email: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  const items = await Promise.all(
    convs.map(async (c) => {
      const other = c.userAId === me ? c.userB : c.userA;
      const last = c.messages[0] || null;
      const unread = await prisma.message.count({ where: { conversationId: c.id, receiverId: me, read: false } });
      return { id: c.id, other, last, unread, updatedAt: c.updatedAt };
    })
  );
  res.json(items);
};

export const startChat = async (req, res) => {
  const me = req.user.id;
  const { toUserId, content } = req.body;
  if (!toUserId) return res.status(400).json({ message: "Missing toUserId" });
  if (Number(toUserId) === me) return res.status(400).json({ message: "Cannot start chat with yourself" });
  const [a, b] = normalizePair(me, Number(toUserId));
  let convo = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  if (!convo) {
    convo = await prisma.conversation.create({ data: { userAId: a, userBId: b } });
  }
  if (content) {
    await prisma.message.create({ data: { content, senderId: me, receiverId: Number(toUserId), conversationId: convo.id } });
    await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
  }
  res.status(201).json(convo);
};

export const getMessages = async (req, res) => {
  const me = req.user.id;
  const id = Number(req.params.id);
  const convo = await prisma.conversation.findUnique({ where: { id } });
  if (!convo) return res.status(404).json({ message: "Not found" });
  if (convo.userAId !== me && convo.userBId !== me) return res.status(403).json({ message: "Forbidden" });
  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  // Mark my incoming unread as read
  await prisma.message.updateMany({ where: { conversationId: id, receiverId: me, read: false }, data: { read: true } });
  res.json(messages);
};

export const sendToChat = async (req, res) => {
  const me = req.user.id;
  const id = Number(req.params.id);
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: "Missing content" });
  const convo = await prisma.conversation.findUnique({ where: { id } });
  if (!convo) return res.status(404).json({ message: "Not found" });
  if (convo.userAId !== me && convo.userBId !== me) return res.status(403).json({ message: "Forbidden" });
  const to = convo.userAId === me ? convo.userBId : convo.userAId;
  const msg = await prisma.message.create({ data: { content, senderId: me, receiverId: to, conversationId: id } });
  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
  res.status(201).json(msg);
};

