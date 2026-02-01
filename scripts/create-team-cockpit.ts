import "dotenv/config";
import { PrismaClient, ColumnType, Priority } from "@prisma/client";

const prisma = new PrismaClient();

const WORKSPACE_NAME = "Jan & Chris";
const PROJECT_NAME = "Team Cockpit";
const AREA_NAME = "Cockpit";
const BOARD_NAME = "Team Cockpit";

const COLUMNS = [
  { name: "Heute", type: ColumnType.NORMAL },
  { name: "Diese Woche", type: ColumnType.NORMAL },
  { name: "Rücksprache", type: ColumnType.NORMAL },
  { name: "Geplant", type: ColumnType.NORMAL },
  { name: "Erledigt", type: ColumnType.NORMAL },
];

async function main() {
  // 1) Workspace finden oder anlegen
  let workspace = await prisma.workspace.findFirst({
    where: { name: WORKSPACE_NAME },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: WORKSPACE_NAME },
    });
  }

  // 2) Projekt finden oder anlegen
  let project = await prisma.project.findFirst({
    where: {
      name: PROJECT_NAME,
      workspaceId: workspace.id,
    },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: PROJECT_NAME,
        workspaceId: workspace.id,
      },
    });
  }

  // 3) Area finden oder anlegen
  let area = await prisma.area.findFirst({
    where: {
      name: AREA_NAME,
      projectId: project.id,
    },
  });

  if (!area) {
    area = await prisma.area.create({
      data: {
        name: AREA_NAME,
        projectId: project.id,
      },
    });
  }

  // 4) Board finden oder anlegen
  let board = await prisma.board.findFirst({
    where: {
      name: BOARD_NAME,
      areaId: area.id,
    },
  });

  if (!board) {
    board = await prisma.board.create({
      data: {
        name: BOARD_NAME,
        areaId: area.id,
        notes:
          "Team Cockpit: Zentrale Arbeitsübersicht. Aufgaben hier zeigen Zuständigkeit, Projekt, Priorität, Notizen. Spalten: Heute / Diese Woche / Rücksprache / Geplant / Erledigt.",
      },
    });
  }

  // 5) Columns sicherstellen (in der richtigen Reihenfolge)
  // Wir löschen KEINE bestehenden Spalten, wir ergänzen nur fehlende.
  const existing = await prisma.column.findMany({
    where: { boardId: board.id },
    select: { id: true, name: true },
  });

  const existingNames = new Set(existing.map((c) => c.name));

  let position = 0;
  for (const col of COLUMNS) {
    if (!existingNames.has(col.name)) {
      await prisma.column.create({
        data: {
          boardId: board.id,
          name: col.name,
          type: col.type,
          position,
        },
      });
    }
    position += 1;
  }

  console.log("✅ Team Cockpit ist bereit.");
  console.log("Projekt:", PROJECT_NAME);
  console.log("Board:", BOARD_NAME);
  console.log("Board ID:", board.id);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
