import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROJECT_NAME = "Tunebob";

function startsWithTunebob(name: string) {
  return name.trim().toLowerCase().startsWith("tunebob");
}

async function main() {
  console.log(`▶️ Bereinige Boards im Projekt "${PROJECT_NAME}"`);

  const project = await prisma.project.findFirst({
    where: { name: PROJECT_NAME },
    select: {
      id: true,
      areas: {
        select: {
          id: true,
          boards: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error(`Projekt "${PROJECT_NAME}" nicht gefunden`);
  }

  let deleted = 0;

  for (const area of project.areas) {
    for (const board of area.boards) {
      if (!startsWithTunebob(board.name)) {
        console.log(`🗑️ Lösche Board: "${board.name}" (${board.id})`);

        await prisma.task.deleteMany({ where: { boardId: board.id } });
        await prisma.column.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });

        deleted++;
      }
    }
  }

  console.log(`✅ Fertig. Gelöschte Boards: ${deleted}`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
