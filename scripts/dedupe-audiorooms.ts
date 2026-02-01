import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Wir behalten dieses Projekt:
const KEEP_NAME = "Audiorooms GmbH";
// Dieses wird reingemerged und danach gelöscht:
const REMOVE_NAME = "Audiorooms";

async function main() {
  console.log("▶️ Deduping startet…");

  const keep = await prisma.project.findFirst({
    where: { name: KEEP_NAME },
    select: { id: true, name: true },
  });

  const remove = await prisma.project.findFirst({
    where: { name: REMOVE_NAME },
    select: { id: true, name: true },
  });

  if (!keep) {
    throw new Error(`KEEP Projekt nicht gefunden: "${KEEP_NAME}"`);
  }
  if (!remove) {
    console.log(`✅ Kein Duplikat gefunden. "${REMOVE_NAME}" existiert nicht.`);
    return;
  }

  if (keep.id === remove.id) {
    console.log("✅ KEEP und REMOVE sind identisch – nichts zu tun.");
    return;
  }

  console.log(`✅ KEEP:   ${keep.name} (${keep.id})`);
  console.log(`✅ REMOVE: ${remove.name} (${remove.id})`);

  // 1) Alle Areas von REMOVE → KEEP verschieben
  const movedAreas = await prisma.area.updateMany({
    where: { projectId: remove.id },
    data: { projectId: keep.id },
  });

  console.log(`✅ Areas verschoben: ${movedAreas.count}`);

  // 2) REMOVE Projekt löschen (dadurch bleiben alle Boards/Columns/Tasks erhalten,
  // weil sie über Areas/Boards referenziert sind und wir nur projectId geändert haben)
  await prisma.project.delete({
    where: { id: remove.id },
  });

  console.log(`✅ Projekt gelöscht: "${REMOVE_NAME}"`);
  console.log("🎉 Fertig. Bitte Dashboard neu laden.");
}

main()
  .catch((e) => {
    console.error("❌ Deduping Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
