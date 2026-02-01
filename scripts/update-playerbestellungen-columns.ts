import "dotenv/config";
import { prisma } from "../lib/prisma";

const TARGET_PROJECT = "audiorooms";
const BOARD_NAME_HINT = "player";

async function main() {
  const boards = await prisma.board.findMany({
    where: {
      name: { contains: BOARD_NAME_HINT, mode: "insensitive" },
    },
    include: {
      area: { include: { project: true } },
      columns: { orderBy: { position: "asc" } },
    },
  });

  const candidates = boards.filter((b) =>
    b.area.project.name.toLowerCase().includes(TARGET_PROJECT)
  );

  if (candidates.length === 0) {
    console.log("❌ Kein Board gefunden (Player* in Audiorooms).");
    console.log(
      "Gefundene Boards:",
      boards.map((b) => `${b.area.project.name} / ${b.name}`).join(" | ") || "—"
    );
    return;
  }

  if (candidates.length > 1) {
    console.log("⚠️ Mehrere Boards gefunden, nehme das erste:");
    candidates.forEach((b) =>
      console.log(`- ${b.area.project.name} / ${b.name} (${b.id})`)
    );
  }

  const board = candidates[0];
  console.log(`▶️ Board: ${board.area.project.name} / ${board.name} (${board.id})`);

  const columns = board.columns;
  const renameColumn = async (from: string, to: string) => {
    const col = columns.find((c) => c.name.toLowerCase() === from.toLowerCase());
    if (!col || col.name === to) return false;
    await prisma.column.update({ where: { id: col.id }, data: { name: to } });
    console.log(`✅ Spalte umbenannt: "${col.name}" → "${to}"`);
    return true;
  };

  const renamedBestellungen =
    (await renameColumn("Inbox", "Bestellungen")) ||
    (await renameColumn("Neue Bestellungen", "Bestellungen"));
  if (!renamedBestellungen) {
    console.log("ℹ️ Keine Inbox/Neue-Bestellungen-Spalte gefunden oder bereits umbenannt.");
  }

  const renamedVorbereitung =
    (await renameColumn("Diese Woche", "In Vorbereitung")) ||
    (await renameColumn("In Einrichtung", "In Vorbereitung"));
  if (!renamedVorbereitung) {
    console.log("ℹ️ Keine 'Diese Woche'/'In Einrichtung' gefunden oder bereits umbenannt.");
  }

  const renamedVersendet = await renameColumn("In Arbeit", "Versendet");
  if (!renamedVersendet) {
    console.log("ℹ️ Keine 'In Arbeit' gefunden oder bereits umbenannt.");
  }

  const targetOrder = ["Bestellungen", "In Vorbereitung", "Versendet"];
  const existingByName = new Map(
    (await prisma.column.findMany({ where: { boardId: board.id } })).map((c) => [
      c.name.toLowerCase(),
      c,
    ])
  );

  for (let i = 0; i < targetOrder.length; i++) {
    const name = targetOrder[i];
    const existing = existingByName.get(name.toLowerCase());
    if (existing) {
      if (existing.position !== i) {
        await prisma.column.update({
          where: { id: existing.id },
          data: { position: i },
        });
      }
      console.log(`ℹ️ Spalte existiert bereits: ${name}`);
      continue;
    }
    await prisma.column.create({
      data: {
        boardId: board.id,
        name,
        type: "NORMAL",
        position: i,
      },
    });
    console.log(`✅ Spalte erstellt: ${name}`);
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
