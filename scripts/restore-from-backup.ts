import "dotenv/config";
import fs from "node:fs";
import { prisma } from "../lib/prisma";

type Backup = {
  exportedAt?: string;
  projects?: Array<{
    id: string;
    workspaceId: string;
    name: string;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    areas?: Array<{
      id: string;
      projectId: string;
      name: string;
      createdAt?: string;
      updatedAt?: string;
      boards?: Array<{
        id: string;
        areaId: string;
        name: string;
        notes?: string | null;
        createdAt?: string;
        updatedAt?: string;
        columns?: Array<{
          id: string;
          boardId: string;
          name: string;
          type: string;
          position: number;
          createdAt?: string;
          updatedAt?: string;
        }>;
        tasks?: Array<{
          id: string;
          boardId: string;
          columnId: string;
          title: string;
          notes?: string | null;
          priority: string;
          position: number;
          assigneeId?: string | null;
          createdAt?: string;
          updatedAt?: string;
        }>;
      }>;
    }>;
  }>;
  users?: Array<{
    id: string;
    name: string;
    email?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

function toDate(value?: string) {
  return value ? new Date(value) : undefined;
}

async function ensureWorkspace(workspaceId: string) {
  const existing = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!existing) {
    await prisma.workspace.create({
      data: { id: workspaceId, name: "Workspace" },
    });
  }
}

async function main() {
  const file = process.argv[2] ?? "backup-2026-01-27T15-08-44-505Z.json";
  if (!fs.existsSync(file)) {
    throw new Error(`Backup not found: ${file}`);
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Backup;
  if (!data.projects?.length) {
    throw new Error("Backup has no projects. Use a backup created by backup-current-state.ts.");
  }

  console.log(`▶️ Restoring from ${file}`);

  // Users
  for (const user of data.users ?? []) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        createdAt: toDate(user.createdAt),
        updatedAt: toDate(user.updatedAt),
      },
      update: {
        name: user.name,
        email: user.email ?? null,
        updatedAt: toDate(user.updatedAt),
      },
    });
  }

  // Projects -> Areas -> Boards -> Columns -> Tasks
  for (const project of data.projects) {
    await ensureWorkspace(project.workspaceId);

    await prisma.project.upsert({
      where: { id: project.id },
      create: {
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        notes: project.notes ?? null,
        createdAt: toDate(project.createdAt),
        updatedAt: toDate(project.updatedAt),
      },
      update: {
        workspaceId: project.workspaceId,
        name: project.name,
        notes: project.notes ?? null,
        updatedAt: toDate(project.updatedAt),
      },
    });

    for (const area of project.areas ?? []) {
      await prisma.area.upsert({
        where: { id: area.id },
        create: {
          id: area.id,
          projectId: area.projectId,
          name: area.name,
          createdAt: toDate(area.createdAt),
          updatedAt: toDate(area.updatedAt),
        },
        update: {
          projectId: area.projectId,
          name: area.name,
          updatedAt: toDate(area.updatedAt),
        },
      });

      for (const board of area.boards ?? []) {
        await prisma.board.upsert({
          where: { id: board.id },
          create: {
            id: board.id,
            areaId: board.areaId,
            name: board.name,
            notes: board.notes ?? null,
            createdAt: toDate(board.createdAt),
            updatedAt: toDate(board.updatedAt),
          },
          update: {
            areaId: board.areaId,
            name: board.name,
            notes: board.notes ?? null,
            updatedAt: toDate(board.updatedAt),
          },
        });

        for (const column of board.columns ?? []) {
          await prisma.column.upsert({
            where: { id: column.id },
            create: {
              id: column.id,
              boardId: column.boardId,
              name: column.name,
              type: column.type as any,
              position: column.position,
              createdAt: toDate(column.createdAt),
              updatedAt: toDate(column.updatedAt),
            },
            update: {
              boardId: column.boardId,
              name: column.name,
              type: column.type as any,
              position: column.position,
              updatedAt: toDate(column.updatedAt),
            },
          });
        }

        for (const task of board.tasks ?? []) {
          await prisma.task.upsert({
            where: { id: task.id },
            create: {
              id: task.id,
              boardId: task.boardId,
              columnId: task.columnId,
              title: task.title,
              notes: task.notes ?? null,
              priority: task.priority as any,
              position: task.position,
              assigneeId: task.assigneeId ?? null,
              createdAt: toDate(task.createdAt),
              updatedAt: toDate(task.updatedAt),
            },
            update: {
              boardId: task.boardId,
              columnId: task.columnId,
              title: task.title,
              notes: task.notes ?? null,
              priority: task.priority as any,
              position: task.position,
              assigneeId: task.assigneeId ?? null,
              updatedAt: toDate(task.updatedAt),
            },
          });
        }
      }
    }
  }

  console.log("✅ Restore complete.");
}

main()
  .catch((e) => {
    console.error("❌ Restore failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
