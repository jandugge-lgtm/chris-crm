import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureWorkspace(name: string) {
  const w = await prisma.workspace.findFirst({ where: { name } });
  if (w) return w;
  return prisma.workspace.create({ data: { name } });
}

async function ensureProject(workspaceId: string, name: string) {
  const p = await prisma.project.findFirst({ where: { workspaceId, name } });
  if (p) return p;
  return prisma.project.create({ data: { workspaceId, name } });
}

async function ensureArea(projectId: string, name: string) {
  const a = await prisma.area.findFirst({ where: { projectId, name } });
  if (a) return a;
  return prisma.area.create({ data: { projectId, name } });
}

async function ensureBoard(areaId: string, name: string, notes?: string) {
  const b = await prisma.board.findFirst({ where: { areaId, name } });
  if (b) return b;
  return prisma.board.create({ data: { areaId, name, notes } });
}

async function ensureColumns(boardId: string, names: string[]) {
  const existing = await prisma.column.findMany({
    where: { boardId },
    select: { id: true, name: true, position: true },
    orderBy: { position: "asc" },
  });

  const have = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  let pos = existing.length ? Math.max(...existing.map((c) => c.position)) : -1;

  for (const n of names) {
    if (have.has(n.trim().toLowerCase())) continue;
    pos += 1;
    await prisma.column.create({
      data: {
        boardId,
        name: n,
        position: pos,
        // type bleibt default (NORMAL), kompatibel mit deinem Schema
      },
    });
  }
}

async function main() {
  console.log("▶️ Erstelle Projekt: Mediarooms");

  // Workspace wie bisher
  const workspace = await ensureWorkspace("Jan & Chris");

  // Projekt
  const project = await ensureProject(workspace.id, "Mediarooms");

  // Area (wir nutzen eine Standard-Area, damit es wie bei Audiorooms/Tunebob passt)
  const area = await ensureArea(project.id, "Boards");

  // Board: Pharma APP
  const board = await ensureBoard(
    area.id,
    "Mediarooms – Pharma APP",
    "Projektboard für Mediarooms / Pharma App"
  );

  // Columns / Listen
  await ensureColumns(board.id, [
    "Ideen & Input",
    "Content",
    "App Dev",
    "Marketing",
    "Review / Freigabe",
    "Done",
  ]);

  console.log("✅ Fertig:");
  console.log("   Projekt:", project.name);
  console.log("   Board:", board.name);
  console.log("   Board-ID:", board.id);
}

main()
  .catch((e) => {
    console.error("❌ Create Mediarooms Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
