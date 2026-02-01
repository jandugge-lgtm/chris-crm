import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/share";

const [boardId, password] = process.argv.slice(2);

if (!boardId || !password) {
  console.error("Usage: tsx scripts/create-board-share.ts <boardId> <password>");
  process.exit(1);
}

const token = crypto.randomBytes(16).toString("hex");

const share = await prisma.boardShareLink.create({
  data: {
    boardId,
    token,
    passwordHash: hashPassword(password),
  },
});

console.log(`/share/boards/${share.token}`);
await prisma.$disconnect();
