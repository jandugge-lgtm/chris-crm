import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      areas: {
        orderBy: { name: "asc" },
        include: {
          boards: {
            orderBy: { name: "asc" },
            include: {
              columns: true,
              tasks: true,
            },
          },
        },
      },
    },
  });

  let totalBoards = 0;
  let totalColumns = 0;
  let totalTasks = 0;

  console.log("\n=== PROJECTS / AREAS / BOARDS ===\n");
  for (const p of projects) {
    console.log(`\n📁 Project: ${p.name} (${p.id})`);
    for (const a of p.areas) {
      console.log(`  └─ 🗂 Area: ${a.name} (${a.id})`);
      for (const b of a.boards) {
        totalBoards += 1;
        totalColumns += b.columns.length;
        totalTasks += b.tasks.length;
        console.log(
          `      └─ 📋 Board: ${b.name} (${b.id}) | columns: ${b.columns.length} | tasks: ${b.tasks.length}`
        );
      }
    }
  }

  console.log(
    `\nTotals: projects ${projects.length} | boards ${totalBoards} | columns ${totalColumns} | tasks ${totalTasks}\n`
  );
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
