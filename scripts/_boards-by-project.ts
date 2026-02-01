import { prisma } from "../lib/prisma";

const projectName = process.argv[2];
if (!projectName) {
  console.error("Usage: tsx scripts/_boards-by-project.ts <projectName>");
  process.exit(1);
}

async function main() {
  const rows = await prisma.board.findMany({
    where: { area: { project: { name: projectName } } },
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
