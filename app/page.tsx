import Link from "next/link";
import { prisma } from "../lib/prisma";

export default async function Page() {
  async function updateOrganisationMeetingDate(formData: FormData) {
    "use server";
    const raw = String(formData.get("meetingDate") ?? "").trim();
    if (!raw) return;

    const { revalidatePath } = await import("next/cache");
    const board = await prisma.board.findFirst({
      where: { name: "Organisation" },
      select: { id: true, notes: true },
    });
    if (!board) return;

    const marker = `[meeting-date:${raw}]`;
    const cleaned = (board.notes ?? "").replace(/\s*\[meeting-date:[^\]]+\]\s*/g, "").trim();
    const nextNotes = cleaned ? `${cleaned}\n\n${marker}` : marker;

    await prisma.board.update({
      where: { id: board.id },
      data: { notes: nextNotes },
    });

    revalidatePath("/");
    revalidatePath(`/boards/${board.id}`);
  }

  const now = new Date();
  const currentMonthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Boards direkt laden und nur Felder selektieren, die sicher existieren.
  // Wichtig: KEIN include bei area, sonst versucht Prisma Area.notes zu lesen.
  const boards = await prisma.board.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      notes: true,
      area: {
        select: {
          id: true,
          name: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Nach Projekt gruppieren
  const byProject = new Map<
    string,
    { projectId: string; projectName: string; boards: typeof boards }
  >();

  for (const b of boards) {
    const projectId = b.area.project.id;
    const projectName = b.area.project.name;

    if (!byProject.has(projectId)) {
      byProject.set(projectId, { projectId, projectName, boards: [] as any });
    }
    byProject.get(projectId)!.boards.push(b as any);
  }

  const projects = Array.from(byProject.values()).sort((a, b) =>
    a.projectName.localeCompare(b.projectName)
  );

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const tasks = await prisma.task.findMany({
    where: { assigneeId: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      board: { select: { name: true } },
    },
  });

  const organisationBoard = await prisma.board.findFirst({
    where: { name: "Organisation" },
    select: { id: true, notes: true },
  });
  const meetingDate =
    organisationBoard?.notes?.match(/\[meeting-date:([^\]]+)\]/)?.[1] ?? null;
  const organisationTasks = organisationBoard
    ? await prisma.task.findMany({
        where: { boardId: organisationBoard.id },
        select: { id: true, title: true, column: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
    : [];

  const monthTasks = await prisma.task.findMany({
    where: {
      planning: {
        is: {
          bucket: "WEEK",
          OR: [
            { plannedAt: { gte: monthStart, lte: monthEnd } },
            { plannedTo: { gte: monthStart, lte: monthEnd } },
            { plannedAt: { lte: monthStart }, plannedTo: { gte: monthEnd } },
          ],
        },
      },
    },
    select: {
      id: true,
      title: true,
      planning: { select: { plannedAt: true, plannedTo: true } },
      assignee: { select: { name: true } },
      board: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const monthTasksSorted = [...monthTasks].sort((a, b) => {
    const aDate = a.planning?.plannedAt?.getTime() ?? 0;
    const bDate = b.planning?.plannedAt?.getTime() ?? 0;
    return aDate - bDate;
  });

  const formatShort = (d: Date | null | undefined) =>
    d ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(d) : "—";

  const byUser = new Map(
    users.map((u) => [u.id, { name: u.name, tasks: [] as typeof tasks }])
  );

  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const entry = byUser.get(t.assigneeId);
    if (entry) entry.tasks.push(t);
  }

  return (
    <main className="min-h-screen bg-black px-10 py-8 text-zinc-100">
      <h1 className="mb-10 text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold tracking-wide text-red-400">
          Organisation
        </h2>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-red-400">Projektverteilung</h3>
            {organisationBoard ? (
              <Link
                href={`/boards/${organisationBoard.id}`}
                className="text-xs text-sky-300 hover:text-sky-200"
              >
                Zum Board Organisation
              </Link>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Wer arbeitet gerade woran? Aufgaben & Boards pro Person.
          </p>

          <div className="mt-4 space-y-3">
            {users.map((u) => {
              const entry = byUser.get(u.id);
              const userTasks = entry?.tasks ?? [];
              const boardNames = Array.from(
                new Set(userTasks.map((t) => t.board?.name ?? ""))
              ).filter(Boolean);

              return (
                <Link
                  key={u.id}
                  href={`/cockpit/person/${u.id}`}
                  className="rounded-xl border border-zinc-800 bg-black/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-emerald-300">
                      {u.name}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {userTasks.length} Tasks
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-zinc-200">
                    {userTasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="truncate">
                        {t.title}
                        {t.board?.name ? (
                          <span className="text-xs text-zinc-500">
                            {" "}
                            · {t.board.name}
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {userTasks.length === 0 ? (
                      <div className="text-sm text-zinc-500">Keine Aufgaben</div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-lg font-semibold text-red-400">Aktueller Monat</h3>
          <div className="mt-2 text-3xl font-semibold text-zinc-100">
            {currentMonthLabel}
          </div>
          <div className="mt-3 space-y-2 text-sm text-zinc-200">
            {monthTasksSorted.length === 0 ? (
              <div className="text-sm text-zinc-500">Keine Aufgaben im Monat</div>
            ) : (
              monthTasksSorted.map((t) => (
                <div key={t.id} className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                  <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {formatShort(t.planning?.plannedAt)} bis {formatShort(t.planning?.plannedTo)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {t.assignee?.name ?? "—"} · {t.board?.name ?? "—"}
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500">Automatisch nach Serverzeit.</p>
        </div>
        {organisationBoard ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-red-400">
                Themen für Meeting am{" "}
                {meetingDate
                  ? new Intl.DateTimeFormat("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(`${meetingDate}T00:00:00`))
                  : "…"}
              </h3>
              <Link
                href={`/boards/${organisationBoard.id}`}
                className="text-xs text-sky-300 hover:text-sky-200"
              >
                Zum Board
              </Link>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Themen sammeln und bis zum Meeting vorbereiten.
            </p>
            <form action={updateOrganisationMeetingDate} className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                name="meetingDate"
                defaultValue={meetingDate ?? ""}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
              />
              <button
                type="submit"
                className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 hover:border-sky-500/70"
              >
                Datum speichern
              </button>
            </form>
            <div className="mt-3 space-y-2 text-sm text-zinc-200">
              {organisationTasks.length === 0 ? (
                <div className="text-sm text-zinc-500">Noch keine Themen</div>
              ) : (
                organisationTasks.map((t) => (
                  <div key={t.id} className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                    <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{t.column?.name ?? "—"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-lg font-semibold text-red-400">Themen für Meeting am …</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Board „Organisation“ fehlt noch.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-12">
        {projects.map((p) => (
          <section key={p.projectId}>
            {/* Metallic Blau */}
            <h2
              className="
                mb-5 text-2xl font-semibold tracking-wide
                bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500
                bg-clip-text text-transparent
              "
            >
              {p.projectName}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {p.boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  prefetch={false}
                  className="
                    group rounded-xl border border-zinc-800
                    bg-zinc-900/70 p-5
                    transition
                    hover:border-sky-500/60
                    hover:bg-zinc-900
                  "
                >
                  <h3 className="text-lg font-medium group-hover:text-sky-300">
                    {board.name}
                  </h3>

                  {board.notes ? (
                    <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                      {board.notes}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">Keine Notiz</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
