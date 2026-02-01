import { prisma } from "../lib/prisma";

const term = process.argv[2] ?? "Team Cockpit";

async function main() {
  const rows = await prisma.board.findMany({
    where: { name: { contains: term, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      notes: true,
      area: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
    },
    orderBy: [{ name: "asc" }],
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
