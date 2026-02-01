import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL gesetzt:", !!process.env.DATABASE_URL);

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, boards: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  const p = projects.find((x) => x.name.toLowerCase() === "mediarooms");
  console.log("\nProjekt Mediarooms:", p ? `${p.name} (${p.id})` : "NICHT GEFUNDEN");
  if (p) {
    console.log("Boards in Mediarooms:", p.boards.length);
    for (const b of p.boards) console.log(`- ${b.name} (${b.id})`);
  }

  const allPharma = await prisma.board.findMany({
    where: { name: { contains: "Pharma", mode: "insensitive" } },
    select: { id: true, name: true, project: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  console.log("\nBoards mit 'Pharma' im Namen:");
  if (allPharma.length === 0) console.log("(keine)");
  for (const b of allPharma) console.log(`- ${b.name} (${b.id}) | Projekt: ${b.project?.name ?? "-"}`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
