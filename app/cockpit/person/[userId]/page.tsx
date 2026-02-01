import Link from "next/link";
import { prisma } from "../../../../lib/prisma";
import PersonBoardClient from "./PersonBoardClient";

type PageProps = {
  params: { userId: string };
};

export default async function PersonCockpitPage({ params }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true },
  });

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-10 text-zinc-100">
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          ← Dashboard
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Person nicht gefunden</h1>
      </main>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const boards = await prisma.board.findMany({
    include: {
      area: { include: { project: true } },
      columns: { orderBy: { position: "asc" } },
    },
    orderBy: [{ name: "asc" }],
  });

  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id },
    include: {
      assignee: true,
      column: true,
      board: { include: { area: { include: { project: true } } } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const hasPlannedTo = await prisma.$queryRaw<
    { exists: boolean }[]
  >`SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'TaskPlanning'
        AND column_name = 'plannedTo'
    ) AS "exists";`;

  const taskIds = tasks.map((t) => t.id);
  const planningRows = taskIds.length
    ? hasPlannedTo?.[0]?.exists
      ? await prisma.taskPlanning.findMany({
          where: { taskId: { in: taskIds } },
          select: { taskId: true, bucket: true, plannedAt: true, plannedTo: true },
        })
      : await prisma.taskPlanning.findMany({
          where: { taskId: { in: taskIds } },
          select: { taskId: true, bucket: true, plannedAt: true },
        })
    : [];

  const planningByTaskId = new Map(planningRows.map((p) => [p.taskId, p]));

  return (
    <main className="min-h-screen bg-black px-10 py-8 text-zinc-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-red-400 via-rose-300 to-red-500 bg-clip-text text-transparent">
              {user.name} · Cockpit
            </span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Aufgabenübersicht & Wochenplanung für {user.name}.
          </p>
        </div>
      </div>

      <PersonBoardClient
        user={user}
        users={users}
        boards={boards}
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          priority: t.priority,
          assigneeId: t.assigneeId,
          boardId: t.boardId,
          columnId: t.columnId,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
          board: {
            id: t.board.id,
            name: t.board.name,
            area: { project: { name: t.board.area.project.name } },
          },
          column: { id: t.column.id, name: t.column.name, type: t.column.type },
          planning: planningByTaskId.get(t.id)
            ? {
                bucket: planningByTaskId.get(t.id)!.bucket as any,
                plannedAt: planningByTaskId.get(t.id)!.plannedAt
                  ? planningByTaskId.get(t.id)!.plannedAt!.toISOString()
                  : null,
                plannedTo:
                  "plannedTo" in planningByTaskId.get(t.id)!
                    ? (planningByTaskId.get(t.id) as any).plannedTo
                      ? (planningByTaskId.get(t.id) as any).plannedTo.toISOString()
                      : null
                    : null,
              }
            : null,
        }))}
      />
    </main>
  );
}
