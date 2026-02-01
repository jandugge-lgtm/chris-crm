import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const rows = await prisma.board.findMany({
    where: { name: "Team Cockpit" },
    select: {
      id: true,
      name: true,
      notes: true,
      area: {
        select: { id: true, name: true, project: { select: { id: true, name: true } } },
      },
    },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
