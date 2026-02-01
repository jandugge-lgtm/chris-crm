import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();

async function main() {
  console.log("▶️ Backup startet…");

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
  });

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
  });

  const areas = await prisma.area.findMany({
    orderBy: { createdAt: "asc" },
  });

  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "asc" },
  });

  const columns = await prisma.column.findMany({
    orderBy: [{ boardId: "asc" }, { position: "asc" }],
  });

  const tasks = await prisma.task.findMany({
    orderBy: [{ boardId: "asc" }, { columnId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    counts: {
      workspaces: workspaces.length,
      projects: projects.length,
      areas: areas.length,
      boards: boards.length,
      columns: columns.length,
      tasks: tasks.length,
      users: users.length,
    },
    workspaces,
    projects,
    areas,
    boards,
    columns,
    tasks,
    users,
  };

  const file = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");

  console.log("✅ Backup geschrieben:", file);
  console.log("📦 Counts:", payload.counts);
}

main()
  .catch((e) => {
    console.error("❌ Backup Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  