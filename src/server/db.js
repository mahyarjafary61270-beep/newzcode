import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const userPublic = {
  id: true,
  username: true,
  displayName: true,
  color: true,
  lastSeen: true
};

export const pubUser = (u) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  color: u.color,
  lastSeen: u.lastSeen
});

// گروه‌بندی ری‌اکشن‌ها: [{ emoji, userIds: [...] }]
export const groupReactions = (rows) =>
  Object.values(
    rows.reduce((acc, r) => {
      (acc[r.emoji] ??= { emoji: r.emoji, userIds: [] }).userIds.push(r.userId);
      return acc;
    }, {})
  );

// شکل یکسان پیام برای REST و سوکت
export const serializeMessage = (m) => ({
  id: m.id,
  channelId: m.channelId,
  content: m.content,
  createdAt: m.createdAt,
  editedAt: m.editedAt ?? null,
  user: pubUser(m.user),
  replyTo: m.replyTo
    ? { id: m.replyTo.id, content: String(m.replyTo.content).slice(0, 120), user: pubUser(m.replyTo.user) }
    : null,
  reactions: groupReactions(m.reactions || [])
});
