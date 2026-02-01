import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ONLY_PROJECT = "Tunebob";

function norm(s: string) {
  return s.trim().toLowerCase();
}

async function main() {
  console.log(`▶️ Deduping duplicate boards nur für Projekt: ${ONLY_PROJECT}`);

  const project = await prisma.project.findFirst({
    where: { name: ONLY_PROJECT },
    select: {
      id: true,
      name: true,
      areas: {
        select: {
          id: true,
          name: true,
          boards: { select: { id: true, name: true, createdAt: true } },
        },
      },
    },
  });

  if (!project) throw new Error(`Projekt nicht gefunden: "${ONLY_PROJECT}"`);

  const allBoards = project.areas.flatMap((a) =>
    a.boards.map((b) => ({ ...b, areaId: a.id, areaName: a.name }))
  );

  const groups = new Map<string, typeof allBoards>();
  for (const b of allBoards) {
    const key = norm(b.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);

  if (dupGroups.length === 0) {
    console.log("✅ Keine Dubletten gefunden.");
    return;
  }

  let merged = 0;
  let deletedEmpty = 0;

  console.log(`\n📦 Projekt: ${project.name}`);

  for (const g of dupGroups) {
    const sorted = [...g].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const keep = sorted[0];
    const dups = sorted.slice(1);

    console.log(`\n  ✅ Keep: "${keep.name}" (${keep.id})`);

    for (const d of dups) {
      const dupTaskCount = await prisma.task.count({ where: { boardId: d.id } });

      // leer? -> löschen
      if (dupTaskCount === 0) {
        await prisma.column.deleteMany({ where: { boardId: d.id } });
        await prisma.board.delete({ where: { id: d.id } });
        deletedEmpty++;
        console.log(`     🗑️  Dup gelöscht (leer): ${d.id}`);
        continue;
      }

      // Columns KEEP
      const keepCols = await prisma.column.findMany({
        where: { boardId: keep.id },
        select: { id: true, name: true, position: true },
        orderBy: { position: "asc" },
      });

      const keepColByName = new Map<string, { id: string; name: string; position: number }>();
      for (const c of keepCols) keepColByName.set(norm(c.name), c);

      // Columns DUP
      const dupCols = await prisma.column.findMany({
        where: { boardId: d.id },
        select: { id: true, name: true, position: true, type: true },
        orderBy: { position: "asc" },
      });

      // fehlende Spalten im KEEP anlegen
      for (const dc of dupCols) {
        const key = norm(dc.name);
        if (!keepColByName.has(key)) {
          const nextPos =
            (await prisma.column.aggregate({
              where: { boardId: keep.id },
              _max: { position: true },
            }))._max.position ?? 0;

          const created = await prisma.column.create({
            data: {
              boardId: keep.id,
              name: dc.name,
              position: nextPos + 1,
              type: dc.type as any,
            },
            select: { id: true, name: true, position: true },
          });

          keepColByName.set(key, created);
          console.log(`     ➕ Spalte angelegt im Keep: "${created.name}"`);
        }
      }

      // Tasks rüberziehen
      const dupTasks = await prisma.task.findMany({
        where: { boardId: d.id },
        select: { id: true, columnId: true, position: true, createdAt: true },
        orderBy: [{ columnId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
      });

      const dupColNameById = new Map<string, string>();
      for (const dc of dupCols) dupColNameById.set(dc.id, dc.name);

      for (const t of dupTasks) {
        const colName = dupColNameById.get(t.columnId) ?? "";
        const targetCol = keepColByName.get(norm(colName)) ?? keepCols[0];

        const maxPos =
          (await prisma.task.aggregate({
            where: { boardId: keep.id, columnId: targetCol.id },
            _max: { position: true },
          }))._max.position ?? 0;

        await prisma.task.update({
          where: { id: t.id },
          data: { boardId: keep.id, columnId: targetCol.id, position: maxPos + 1 },
        });
      }

      // Dup löschen
      await prisma.column.deleteMany({ where: { boardId: d.id } });
      await prisma.board.delete({ where: { id: d.id } });

      merged++;
      console.log(`     ✅ gemerged: ${dupTaskCount} Tasks verschoben, Dup gelöscht`);
    }
  }

  console.log("\n🎉 Fertig (Tunebob)!");
  console.log(`✅ gemerged Boards: ${merged}`);
  console.log(`🗑️  gelöscht (leer): ${deletedEmpty}`);
}

main()
  .catch((e) => {
    console.error("❌ Dedup Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
