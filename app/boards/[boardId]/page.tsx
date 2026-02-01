// app/boards/[boardId]/page.tsx
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import BoardClient from "./BoardClient";
import { parseAssignedBoardId } from "../../../lib/assignment-notes";

type PageProps = {
  params: { boardId: string };
};

export default async function BoardPage({ params }: PageProps) {
  const boardId = params.boardId;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      area: { include: { project: true } },
      columns: { orderBy: { position: "asc" } },
    },
  });

  if (!board) {
    return (
      <main className="min-h-screen bg-black p-10 text-zinc-100">
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          ← Dashboard
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Board nicht gefunden</h1>
      </main>
    );
  }

  const tasks = await prisma.task.findMany({
    where: { boardId },
    orderBy: [{ columnId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const assignmentBoards =
    board.name.toLowerCase() === "organisation"
      ? await prisma.board.findMany({
          where: {
            area: {
              project: {
                name: { in: ["Audiorooms", "Tunebob", "Mediarooms", "KI Katalog"], mode: "insensitive" },
              },
            },
          },
          select: { id: true, name: true, area: { select: { project: { select: { name: true } } } } },
          orderBy: [{ name: "asc" }],
        })
      : [];

  const assignmentBoardsByProject = assignmentBoards.reduce(
    (acc, b) => {
      const key = b.area.project.name.toLowerCase();
      acc[key] = acc[key] ?? [];
      acc[key].push({ id: b.id, name: b.name });
      return acc;
    },
    {} as Record<string, { id: string; name: string }[]>
  );

  return (
    <main className="min-h-screen bg-black px-8 py-8 text-zinc-100">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← Dashboard
          </Link>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {board.area?.project?.name ? (
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500 bg-clip-text text-transparent">
                {board.area.project.name}
              </span>
            ) : null}
            {board.area?.project?.name ? (
              <span className="mx-2 text-zinc-600">/</span>
            ) : null}
            <span>{board.name}</span>
          </h1>

          {board.notes ? (
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">{board.notes}</p>
          ) : null}

        </div>
      </div>

      <BoardClient
        boardId={board.id}
        boardName={board.name}
        columns={board.columns.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          position: c.position,
        }))}
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          notes: parseAssignedBoardId(t.notes).cleanNotes,
          priority: t.priority,
          assigneeId: t.assigneeId,
          columnId: t.columnId,
          position: t.position,
          createdAt: t.createdAt.toISOString(),
          dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
          purchasePlayer: t.purchasePlayer ?? false,
          leasePlayer: t.leasePlayer ?? false,
          assignedBoardId: parseAssignedBoardId(t.notes).assignedBoardId,
        }))}
        users={users}
        assignmentBoardsByProject={assignmentBoardsByProject}
      />
    </main>
  );
}
