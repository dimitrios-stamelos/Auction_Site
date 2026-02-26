import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const inbox = async (req, res) => {
  const msgs = await prisma.message.findMany({ where: { receiverId: req.user.id }, include: { sender: true }, orderBy: { createdAt: "desc" } });
  res.json(msgs);
};

export const outbox = async (req, res) => {
  const msgs = await prisma.message.findMany({ where: { senderId: req.user.id }, include: { receiver: true }, orderBy: { createdAt: "desc" } });
  res.json(msgs);
};

export const send = async (req, res) => {
  const { toUserId, content } = req.body;
  if (!toUserId || !content) return res.status(400).json({ message: "Missing fields" });
  // Create or reuse a conversation for this pair
  const me = req.user.id;
  const a = Math.min(me, Number(toUserId));
  const b = Math.max(me, Number(toUserId));
  let convo = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  if (!convo) {
    convo = await prisma.conversation.create({ data: { userAId: a, userBId: b } });
  }
  const created = await prisma.message.create({ data: { content, senderId: me, receiverId: Number(toUserId), conversationId: convo.id } });
  await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
  res.status(201).json({ ...created, conversationId: convo.id });
};

export const unreadCount = async (req, res) => {
  const count = await prisma.message.count({ where: { receiverId: req.user.id, read: false } });
  res.json({ count });
};

export const markRead = async (req, res) => {
  const id = Number(req.params.id);
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg || msg.receiverId !== req.user.id) return res.status(404).json({ message: "Not found" });
  await prisma.message.update({ where: { id }, data: { read: true } });
  res.json({ ok: true });
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return res.status(404).json({ message: "Not found" });
  if (msg.senderId !== req.user.id && msg.receiverId !== req.user.id) return res.status(403).json({ message: "Forbidden" });
  await prisma.message.delete({ where: { id } });
  res.json({ ok: true });
};
