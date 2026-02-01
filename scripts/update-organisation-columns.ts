import "dotenv/config";
import { prisma } from "../lib/prisma";
import { ColumnType } from "@prisma/client";

const BOARD_NAME = "Organisation";
const TARGET_COLUMNS = ["Audiorooms", "Tunebob", "Mediarooms", "Joyello"];

async function main() {
  const board = await prisma.board.findFirst({
    where: { name: BOARD_NAME },
    include: { columns: { orderBy: { position: "asc" } }, area: { include: { project: true } } },
  });

  if (!board) {
    console.log(`❌ Board nicht gefunden: ${BOARD_NAME}`);
    return;
  }

  console.log(`▶️ Board: ${board.area.project.name} / ${board.name} (${board.id})`);

  const existingByName = new Map(board.columns.map((c) => [c.name.toLowerCase(), c]));

  for (let i = 0; i < TARGET_COLUMNS.length; i++) {
    const name = TARGET_COLUMNS[i];
    const existing = existingByName.get(name.toLowerCase());
    if (existing) {
      if (existing.position !== i) {
        await prisma.column.update({ where: { id: existing.id }, data: { position: i } });
      }
      continue;
    }

    await prisma.column.create({
      data: {
        boardId: board.id,
        name,
        type: ColumnType.NORMAL,
        position: i,
      },
    });
  }

  const allowed = new Set(TARGET_COLUMNS.map((n) => n.toLowerCase()));
  const toDelete = board.columns.filter((c) => !allowed.has(c.name.toLowerCase()));
  for (const c of toDelete) {
    await prisma.column.delete({ where: { id: c.id } });
  }

  console.log("✅ Spalten geprüft/angelegt:", TARGET_COLUMNS.join(" / "));
  if (toDelete.length > 0) {
    console.log(`🗑️ Entfernt: ${toDelete.map((c) => c.name).join(" / ")}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
