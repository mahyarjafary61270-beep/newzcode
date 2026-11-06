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
