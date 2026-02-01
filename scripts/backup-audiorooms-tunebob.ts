import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();

const isWantedBoard = (name: string) => {
  const n = name.toLowerCase();
  return n.includes("audiorooms") || n.includes("tunebob");
};

async function main() {
  const boards = await prisma.board.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const wanted = boards.filter((b) => isWantedBoard(b.name));
  const wantedIds = wanted.map((b) => b.id);

  const columns = await prisma.column.findMany({
    where: { boardId: { in: wantedIds } },
    orderBy: [{ boardId: "asc" }, { position: "asc" }],
  });

  const tasks = await prisma.task.findMany({
    where: { boardId: { in: wantedIds } },
    orderBy: [
      { boardId: "asc" },
      { columnId: "asc" },
      { position: "asc" },
      { createdAt: "asc" },
    ],
  });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    boards: wanted,
    columns,
    tasks,
    users,
  };

  fs.writeFileSync(
    "backup-audiorooms-tunebob.json",
    JSON.stringify(payload, null, 2),
    "utf8"
  );

  console.log("✅ Backup geschrieben: backup-audiorooms-tunebob.json");
  console.log(
    `Boards: ${wanted.length}, Columns: ${columns.length}, Tasks: ${tasks.length}, Users: ${users.length}`
  );
}

main()
  .catch((e) => {
    console.error("❌ Backup Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
