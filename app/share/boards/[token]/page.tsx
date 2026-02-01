import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/prisma";
import { shareCookieName, signShareToken } from "../../../../lib/share";
import PasswordGate from "./PasswordGate";

type PageProps = {
  params: { token: string };
};

type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: "A" | "B" | "C";
  columnId: string;
  assigneeName: string | null;
  dueDate: string | null;
};

export default async function ShareBoardPage({ params }: PageProps) {
  const token = params.token;
  const secret = process.env.SHARE_SECRET;

  const share = await prisma.boardShareLink.findUnique({
    where: { token },
    include: {
      board: {
        include: {
          area: { include: { project: true } },
          columns: { orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!share) {
    return (
      <main className="min-h-screen bg-black p-10 text-zinc-100">
        <h1 className="text-2xl font-semibold">Link nicht gefunden</h1>
      </main>
    );
  }

  const board = share.board;
  const boardLabel = board.area?.project?.name
    ? `${board.area.project.name} / ${board.name}`
    : board.name;

  const cookieValue = secret
    ? cookies().get(shareCookieName(token))?.value
    : undefined;
  const isUnlocked = !!(secret && cookieValue === signShareToken(token, secret));

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-black px-8 py-10 text-zinc-100">
        <PasswordGate token={token} boardLabel={boardLabel} />
      </main>
    );
  }

  const tasks = await prisma.task.findMany({
    where: { boardId: board.id },
    orderBy: [{ columnId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    include: { assignee: { select: { name: true } } },
  });

  const tasksByColumn = new Map<string, Task[]>();
  for (const col of board.columns) tasksByColumn.set(col.id, []);
  for (const t of tasks) {
    tasksByColumn.get(t.columnId)?.push({
      id: t.id,
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      columnId: t.columnId,
      assigneeName: t.assignee?.name ?? null,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    });
  }

  const priorityBadge = (prio: "A" | "B" | "C") => {
    if (prio === "A") return "border-red-500/60 text-red-200";
    if (prio === "B") return "border-orange-400/60 text-orange-200";
    return "border-sky-500/60 text-sky-200";
  };

  return (
    <main className="min-h-screen bg-black px-8 py-8 text-zinc-100">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← Dashboard
          </Link>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{boardLabel}</h1>

          {board.notes ? (
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">{board.notes}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {board.columns.map((col) => (
          <section
            key={col.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">{col.name}</h3>
              <span className="text-xs text-zinc-500">
                {(tasksByColumn.get(col.id)?.length ?? 0)} Karten
              </span>
            </div>

            <div className="space-y-3">
              {(tasksByColumn.get(col.id) ?? []).map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${priorityBadge(
                        t.priority
                      )}`}
                    >
                      {t.priority}
                    </span>
                  </div>

                  {t.notes ? (
                    <p className="mt-2 text-sm text-zinc-400">{t.notes}</p>
                  ) : null}

                  {t.dueDate ? (
                    <div className="mt-2 text-xs text-zinc-500">
                      Zu erledigen bis: {t.dueDate}
                    </div>
                  ) : null}

                  {t.assigneeName ? (
                    <div className="mt-3 text-xs text-zinc-500">
                      Zuweisung: {t.assigneeName}
                    </div>
                  ) : null}
                </div>
              ))}
              {(tasksByColumn.get(col.id)?.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-xs text-zinc-500">
                  Keine Karten
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
