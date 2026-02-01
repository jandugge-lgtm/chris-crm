import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    accelerateUrl: process.env.PRISMA_DATABASE_URL,
  });

  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  if (boards.length === 0) {
    console.log("Keine Boards in der DB gefunden.");
  } else {
    console.log("Boards:");
    for (const b of boards) {
      console.log(`- ${b.name}  =>  ${b.id}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
