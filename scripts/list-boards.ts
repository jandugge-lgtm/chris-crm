import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const boards = await prisma.board.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  console.log("\n📋 Boards in DB:");
  for (const b of boards) console.log(`- ${b.name}  (${b.id})`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
