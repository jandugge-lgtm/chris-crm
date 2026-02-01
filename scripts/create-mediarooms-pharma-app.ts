import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROJECT_NAME = "Mediarooms";
const AREA_NAME = "Mediarooms";
const BOARD_NAME = "Pharma APP";

const COLUMNS = [
  "Ideen & Input",
  "Content",
  "App Dev",
  "Marketing",
  "Review / Freigabe",
  "Done",
];

async function main() {
  // 1) Projekt finden/erstellen
  const project =
    (await prisma.project.findFirst({
      where: { name: PROJECT_NAME },
      select: { id: true, name: true },
    })) ??
    (await prisma.project.create({
      data: { name: PROJECT_NAME },
      select: { id: true, name: true },
    }));

  // 2) Area finden/erstellen (Board hängt an Area!)
  const area =
    (await prisma.area.findFirst({
      where: { name: AREA_NAME, projectId: project.id },
      select: { id: true, name: true },
    })) ??
    (await prisma.area.create({
      data: { name: AREA_NAME, projectId: project.id },
      select: { id: true, name: true },
    }));

  // 3) Board finden/erstellen
  const board =
    (await prisma.board.findFirst({
      where: { name: BOARD_NAME, areaId: area.id },
      select: { id: true, name: true },
    })) ??
    (await prisma.board.create({
      data: { name: BOARD_NAME, areaId: area.id },
      select: { id: true, name: true },
    }));

  // 4) Columns anlegen / Positionen setzen
  const existing = await prisma.column.findMany({
    where: { boardId: board.id },
    select: { id: true, name: true, position: true },
  });
  const byName = new Map(existing.map((c) => [c.name, c]));

  for (let i = 0; i < COLUMNS.length; i++) {
    const name = COLUMNS[i];
    const position = i + 1;
    const found = byName.get(name);

    if (!found) {
      await prisma.column.create({
        data: { boardId: board.id, name, position },
      });
      console.log(`➕ Liste angelegt: ${position}. ${name}`);
    } else if (found.position !== position) {
      await prisma.column.update({
        where: { id: found.id },
        data: { position },
      });
      console.log(`↕️ Liste sortiert: ${position}. ${name}`);
    } else {
      console.log(`✅ Liste ok: ${position}. ${name}`);
    }
  }

  console.log("\n✅ Fertig!");
  console.log(`Projekt: ${project.name} (${project.id})`);
  console.log(`Area: ${area.name} (${area.id})`);
  console.log(`Board: ${board.name} (${board.id})`);
  console.log(`➡️ Öffnen: http://localhost:3000/boards/${board.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
