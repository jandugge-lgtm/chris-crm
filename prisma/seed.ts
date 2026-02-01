import "dotenv/config";
import { PrismaClient, ColumnType, Priority } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Helper: find-or-create by unique field(s)
 */
async function getOrCreateWorkspace(name: string) {
  const existing = await prisma.workspace.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.workspace.create({ data: { name } });
}

async function getOrCreateProject(workspaceId: string, name: string) {
  const existing = await prisma.project.findFirst({ where: { workspaceId, name } });
  if (existing) return existing;
  return prisma.project.create({ data: { workspaceId, name } });
}

async function getOrCreateArea(projectId: string, name: string) {
  const existing = await prisma.area.findFirst({ where: { projectId, name } });
  if (existing) return existing;
  return prisma.area.create({ data: { projectId, name } });
}

async function getOrCreateBoard(areaId: string, name: string) {
  const existing = await prisma.board.findFirst({ where: { areaId, name } });
  if (existing) return existing;
  return prisma.board.create({ data: { areaId, name } });
}

async function ensureUsers() {
  const names = ["Jan", "Chris", "Lenni"];
  const out: Record<string, { id: string; name: string }> = {};

  for (const name of names) {
    const u = await prisma.user.findFirst({ where: { name } });
    const created = u ?? (await prisma.user.create({ data: { name } }));
    out[name] = { id: created.id, name: created.name };
  }

  return out;
}

async function ensureColumns(boardId: string, columnNames: string[]) {
  // Bestehende Spalten laden
  const existing = await prisma.column.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
  });

  const byName = new Map(existing.map((c) => [c.name, c]));
  const created: { id: string; name: string; position: number }[] = [];

  for (let i = 0; i < columnNames.length; i++) {
    const name = columnNames[i];
    const found = byName.get(name);
    if (found) {
      // Position ggf. anpassen
      if (found.position !== i) {
        await prisma.column.update({
          where: { id: found.id },
          data: { position: i },
        });
      }
      created.push({ id: found.id, name: found.name, position: i });
    } else {
      const col = await prisma.column.create({
        data: {
          boardId,
          name,
          type: ColumnType.NORMAL, // WICHTIG: keine BLOCKED/DONE/DEFERRED
          position: i,
        },
      });
      created.push({ id: col.id, name: col.name, position: i });
    }
  }

  return created;
}

async function ensureSampleTasks(boardId: string, columns: { id: string; name: string }[], users: Record<string, { id: string }>) {
  // Nur wenn noch keine Tasks existieren, legen wir Beispiele an (nicht spammen)
  const count = await prisma.task.count({ where: { boardId } });
  if (count > 0) return;

  const col = (name: string) => columns.find((c) => c.name === name)?.id ?? columns[0].id;

  await prisma.task.createMany({
    data: [
      {
        boardId,
        columnId: col("Inbox"),
        title: "Aufgaben sammeln / sortieren",
        notes: "Alles was reinkommt erstmal hier rein, dann priorisieren und zuweisen.",
        priority: Priority.B,
        position: 0,
        assigneeId: users["Jan"]?.id ?? null,
      },
      {
        boardId,
        columnId: col("Diese Woche"),
        title: "Top 3 für diese Woche definieren",
        notes: "Was muss bis Freitag erledigt sein?",
        priority: Priority.A,
        position: 1,
        assigneeId: users["Chris"]?.id ?? null,
      },
      {
        boardId,
        columnId: col("Rücksprache"),
        title: "Offene Fragen klären",
        notes: "Alles was auf Antwort / Entscheidung wartet.",
        priority: Priority.B,
        position: 2,
        assigneeId: users["Lenni"]?.id ?? null,
      },
    ],
  });
}

/**
 * Column Sets (nur NORMAL, Namen steuern Logik)
 */
const defaultColumnsAudiorooms = [
  "Inbox",
  "Diese Woche",
  "In Arbeit",
  "Rücksprache",
  "Review",
  "Done",
];

const defaultColumnsTunebob = [
  "Inbox",
  "Diese Woche",
  "In Arbeit",
  "Rücksprache",
  "Review",
  "Done",
];
const playerBestellungenColumns = ["Bestellungen", "In Vorbereitung", "Versendet"];

async function main() {
  console.log("▶️ Seed startet (Audiorooms + Tunebob)…");

  // 1) Users
  const users = await ensureUsers();

  // 2) Workspace
  const workspace = await getOrCreateWorkspace("Jan & Chris");

  // 3) Projekte
  const audioroomsProject = await getOrCreateProject(workspace.id, "Audiorooms");
  const tunebobProject = await getOrCreateProject(workspace.id, "Tunebob");

  // 4) Areas (eine Ebene unter Projekt, um Boards gruppieren zu können)
  const audioroomsArea = await getOrCreateArea(audioroomsProject.id, "Audiorooms GmbH");
  const tunebobArea = await getOrCreateArea(tunebobProject.id, "Tunebob");

  // 5) Boards Audiorooms (wie von dir geplant)
  const audioroomsBoards = [
    "Audiorooms Entwicklung",
    "Audiorooms Kundenbetreuung",
    "Audiorooms Marketing",
    "Player Bestellungen",
    "Steuer",
  ];

  for (const bName of audioroomsBoards) {
    const b = await getOrCreateBoard(audioroomsArea.id, bName);
    const cols = await ensureColumns(
      b.id,
      bName.toLowerCase() === "player bestellungen"
        ? playerBestellungenColumns
        : defaultColumnsAudiorooms
    );
    await ensureSampleTasks(b.id, cols, users);
  }

  // 6) Boards Tunebob
  const tunebobBoards = ["Entwicklung", "Kundenbetreuung", "Marketing", "KI Katalog"];

  for (const bName of tunebobBoards) {
    const b = await getOrCreateBoard(tunebobArea.id, bName);

    // Für "KI Katalog" kannst du später spezielle Spalten machen.
    // Jetzt erstmal schlank: gleiche Column-Set.
    const cols = await ensureColumns(b.id, defaultColumnsTunebob);
    await ensureSampleTasks(b.id, cols, users);
  }

  console.log("✅ Seed fertig.");
}

main()
  .catch((e) => {
    console.error("❌ Seed Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
