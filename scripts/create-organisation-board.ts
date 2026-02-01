import "dotenv/config";
import { ColumnType } from "@prisma/client";
import { prisma } from "../lib/prisma";

const WORKSPACE_NAME = "Jan & Chris";
const PROJECT_NAME = "Team Cockpit";
const AREA_NAME = "Cockpit";
const BOARD_NAME = "Organisation";
const MEETING_PREFIX = "Themen für Meeting am";

async function main() {
  let workspace = await prisma.workspace.findFirst({ where: { name: WORKSPACE_NAME } });
  if (!workspace) {
    workspace = await prisma.workspace.create({ data: { name: WORKSPACE_NAME } });
  }

  let project = await prisma.project.findFirst({
    where: { name: PROJECT_NAME, workspaceId: workspace.id },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { name: PROJECT_NAME, workspaceId: workspace.id },
    });
  }

  let area = await prisma.area.findFirst({
    where: { name: AREA_NAME, projectId: project.id },
  });
  if (!area) {
    area = await prisma.area.create({ data: { name: AREA_NAME, projectId: project.id } });
  }

  let board = await prisma.board.findFirst({
    where: { name: BOARD_NAME, areaId: area.id },
  });
  if (!board) {
    board = await prisma.board.create({
      data: { name: BOARD_NAME, areaId: area.id },
    });
  }

  const existingMeeting = await prisma.column.findFirst({
    where: { boardId: board.id, name: { startsWith: MEETING_PREFIX, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  const meetingName = existingMeeting?.name ?? `${MEETING_PREFIX} `;
  const target = ["Projektverteilung", "Aktueller Monat", meetingName];

  const existing = await prisma.column.findMany({
    where: { boardId: board.id },
    select: { id: true, name: true, position: true },
  });
  const byName = new Map(existing.map((c) => [c.name, c]));

  for (let i = 0; i < target.length; i++) {
    const name = target[i];
    const found = byName.get(name);

    if (found) {
      if (found.position !== i) {
        await prisma.column.update({ where: { id: found.id }, data: { position: i } });
      }
      continue;
    }

    await prisma.column.create({
      data: { boardId: board.id, name, type: ColumnType.NORMAL, position: i },
    });
  }

  console.log("✅ Board bereit:", board.name, board.id);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
