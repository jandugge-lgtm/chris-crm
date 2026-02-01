import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient({
    accelerateUrl: process.env.PRISMA_DATABASE_URL!,
  });

  const c = await p.board.count();
  console.log("✅ DB erreichbar, Boards:", c);

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error("❌", e?.message ?? e);
  process.exit(1);
});
