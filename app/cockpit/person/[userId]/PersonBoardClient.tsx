"use client";

import { useMemo, useState, useTransition } from "react";
import {
  moveTaskToColumn,
  quickAddTask,
  setPlanningRange,
  toggleDone,
  updateTaskAssignee,
  updateTaskNotes,
  updateTaskPriority,
} from "./actions";

type User = { id: string; name: string };
type Column = { id: string; name: string; type: "NORMAL" | "DONE" | "DEFERRED" | "BLOCKED" };
type Board = { id: string; name: string; area: { project: { name: string } }; columns: Column[] };

type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: "A" | "B" | "C";
  assigneeId: string | null;
  boardId: string;
  columnId: string;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string } | null;
  board: { id: string; name: string; area: { project: { name: string } } };
  column: { id: string; name: string; type: Column["type"] };
  planning: { bucket: "NONE" | "TODAY" | "WEEK" | "NEXT"; plannedAt: string | null; plannedTo: string | null } | null;
};

const prioClass = (p: "A" | "B" | "C") =>
  p === "A" ? "border-red-500/60" : p === "B" ? "border-orange-400/60" : "border-sky-500/60";

export default function PersonBoardClient({
  user,
  users,
  boards,
  tasks,
}: {
  user: User;
  users: User[];
  boards: Board[];
  tasks: Task[];
}) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"inwork" | "blocked" | "done" | "all">("inwork");

  // Quick add
  const defaultBoard = boards[0];
  const [qaTitle, setQaTitle] = useState("");
  const [qaBoardId, setQaBoardId] = useState(defaultBoard?.id ?? "");
  const [qaAssigneeId, setQaAssigneeId] = useState(user.id);
  const [qaPrio, setQaPrio] = useState<"A" | "B" | "C">("B");
  const [qaFrom, setQaFrom] = useState("");
  const [qaTo, setQaTo] = useState("");

  const selectedBoard = useMemo(() => boards.find((b) => b.id === qaBoardId), [boards, qaBoardId]);
  const columnsForSelectedBoard = selectedBoard?.columns ?? [];
  const inboxColumnId =
    columnsForSelectedBoard.find((c) => c.name.toLowerCase() === "inbox")?.id ??
    columnsForSelectedBoard[0]?.id ??
    "";

  const [qaColumnId, setQaColumnId] = useState(inboxColumnId);

  const safeColumnId = columnsForSelectedBoard.some((c) => c.id === qaColumnId)
    ? qaColumnId
    : inboxColumnId;

  // Week filter
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo, setWeekTo] = useState("");

  const weekTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.planning?.bucket !== "WEEK") return false;
      const from = t.planning?.plannedAt ? new Date(t.planning.plannedAt) : null;
      const to = t.planning?.plannedTo ? new Date(t.planning.plannedTo) : null;

      if (weekFrom) {
        const wf = new Date(weekFrom);
        if (from && from < wf) return false;
      }
      if (weekTo) {
        const wt = new Date(weekTo);
        if (to && to > wt) return false;
      }
      return true;
    });
  }, [tasks, weekFrom, weekTo]);

  const doneColumnIds = useMemo(() => {
    const ids = boards
      .flatMap((b) => b.columns)
      .filter(
        (c) =>
          c.type === "DONE" ||
          c.name.toLowerCase().includes("done") ||
          c.name.toLowerCase().includes("erledigt")
      )
      .map((c) => c.id);
    return new Set(ids);
  }, [boards]);

  const blockedColumnIds = useMemo(() => {
    const ids = boards
      .flatMap((b) => b.columns)
      .filter(
        (c) =>
          c.type === "BLOCKED" ||
          c.name.toLowerCase().includes("rücksprache") ||
          c.name.toLowerCase().includes("ruecksprache") ||
          c.name.toLowerCase().includes("blocked")
      )
      .map((c) => c.id);
    return new Set(ids);
  }, [boards]);

  const inWorkColumnIds = useMemo(() => {
    const ids = boards
      .flatMap((b) => b.columns)
      .filter((c) => c.name.toLowerCase().includes("in arbeit"))
      .map((c) => c.id);
    return new Set(ids);
  }, [boards]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "done") return tasks.filter((t) => doneColumnIds.has(t.columnId));
    if (filter === "blocked") return tasks.filter((t) => blockedColumnIds.has(t.columnId));
    // inwork
    if (inWorkColumnIds.size > 0) {
      return tasks.filter((t) => inWorkColumnIds.has(t.columnId));
    }
    return tasks.filter(
      (t) => !doneColumnIds.has(t.columnId) && !blockedColumnIds.has(t.columnId)
    );
  }, [tasks, filter, doneColumnIds, blockedColumnIds, inWorkColumnIds]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: Current tasks */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold text-zinc-200">
            Aktuelle Aufgaben · {user.name}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Änderungen hier wirken direkt auf die Boards.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            ["inwork", "In Arbeit"],
            ["blocked", "Rücksprache"],
            ["done", "Erledigt"],
            ["all", "Alle"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k as any)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                filter === k
                  ? "border-sky-500/70 bg-sky-500/10 text-sky-200"
                  : "border-zinc-800 bg-black text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-500">
              Keine Aufgaben
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className={`rounded-2xl border bg-zinc-900/50 p-4 ${prioClass(t.priority)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{t.title}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {t.board.area.project.name} · {t.board.name} · {t.column.name}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await toggleDone(user.id, t.id, t.column.type !== "DONE");
                      })
                    }
                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      t.column.type === "DONE"
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-emerald-500/50"
                    }`}
                  >
                    {t.column.type === "DONE" ? "✔ Erledigt" : "☐ Erledigt"}
                  </button>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs text-zinc-400">Notiz</label>
                  <textarea
                    defaultValue={t.notes ?? ""}
                    className="w-full rounded-lg border border-zinc-800 bg-black/30 p-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
                    rows={3}
                    onBlur={(e) =>
                      startTransition(async () => {
                        await updateTaskNotes(user.id, t.id, e.target.value);
                      })
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div>
                    <div className="mb-1 text-xs text-zinc-400">Zuweisung</div>
                    <select
                      defaultValue={t.assigneeId ?? ""}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-sky-500/60"
                      onChange={(e) =>
                        startTransition(async () => {
                          await updateTaskAssignee(user.id, t.id, e.target.value || null);
                        })
                      }
                    >
                      <option value="">—</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-zinc-400">Priorität</div>
                    <select
                      defaultValue={t.priority}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-sky-500/60"
                      onChange={(e) =>
                        startTransition(async () => {
                          await updateTaskPriority(user.id, t.id, e.target.value as any);
                        })
                      }
                    >
                      <option value="A">A (hoch)</option>
                      <option value="B">B (mittel)</option>
                      <option value="C">C (niedrig)</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-zinc-400">Liste / Spalte</div>
                    <select
                      defaultValue={t.columnId}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-sky-500/60"
                      onChange={(e) =>
                        startTransition(async () => {
                          await moveTaskToColumn(user.id, t.id, e.target.value);
                        })
                      }
                    >
                      {boards
                        .find((b) => b.id === t.boardId)
                        ?.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-xs text-zinc-400">Woche (von / bis)</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="date"
                      defaultValue={t.planning?.plannedAt?.slice(0, 10) ?? ""}
                      className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
                      onChange={(e) => {
                        const from = e.target.value || "";
                        const to = t.planning?.plannedTo?.slice(0, 10) ?? "";
                        startTransition(async () => {
                          await setPlanningRange(user.id, t.id, from || null, to || null);
                        });
                      }}
                    />
                    <input
                      type="date"
                      defaultValue={t.planning?.plannedTo?.slice(0, 10) ?? ""}
                      className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
                      onChange={(e) => {
                        const to = e.target.value || "";
                        const from = t.planning?.plannedAt?.slice(0, 10) ?? "";
                        startTransition(async () => {
                          await setPlanningRange(user.id, t.id, from || null, to || null);
                        });
                      }}
                    />
                    <button
                      className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 hover:border-sky-500/40"
                      onClick={() =>
                        startTransition(async () => {
                          await setPlanningRange(user.id, t.id, null, null);
                        })
                      }
                    >
                      Woche löschen
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Planning + distribution */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-sm font-semibold text-zinc-200">Aufgabe verteilen</div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <input
              value={qaTitle}
              onChange={(e) => setQaTitle(e.target.value)}
              placeholder="Aufgabe…"
              className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
            />

            <select
              value={qaBoardId}
              onChange={(e) => {
                setQaBoardId(e.target.value);
                const b = boards.find((x) => x.id === e.target.value);
                const inbox =
                  b?.columns.find((c) => c.name.toLowerCase() === "inbox")?.id ??
                  b?.columns?.[0]?.id ??
                  "";
                setQaColumnId(inbox);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.area.project.name} · {b.name}
                </option>
              ))}
            </select>

            <select
              value={safeColumnId}
              onChange={(e) => setQaColumnId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
            >
              {columnsForSelectedBoard.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={qaAssigneeId}
              onChange={(e) => setQaAssigneeId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <select
              value={qaPrio}
              onChange={(e) => setQaPrio(e.target.value as any)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
            >
              <option value="A">A (hoch)</option>
              <option value="B">B (mittel)</option>
              <option value="C">C (niedrig)</option>
            </select>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={qaFrom}
                onChange={(e) => setQaFrom(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
              />
              <input
                type="date"
                value={qaTo}
                onChange={(e) => setQaTo(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
              />
            </div>

            <button
              onClick={() =>
                startTransition(async () => {
                  await quickAddTask({
                    userId: user.id,
                    title: qaTitle,
                    boardId: qaBoardId,
                    columnId: safeColumnId,
                    assigneeId: qaAssigneeId || null,
                    priority: qaPrio,
                    plannedFrom: qaFrom || null,
                    plannedTo: qaTo || null,
                  });
                  setQaTitle("");
                })
              }
              className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:border-sky-400/60"
            >
              + Erstellen
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold text-zinc-200">Woche vom / bis</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={weekFrom}
              onChange={(e) => setWeekFrom(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
            />
            <input
              type="date"
              value={weekTo}
              onChange={(e) => setWeekTo(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
            />
          </div>

          <div className="mt-3 space-y-2">
            {weekTasks.length === 0 ? (
              <div className="text-sm text-zinc-500">Keine Aufgaben in der Woche</div>
            ) : (
              weekTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-zinc-800 bg-black/40 p-3"
                >
                  <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
                  <div className="text-xs text-zinc-500">
                    {t.board.name} · {t.column.name}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {t.planning?.plannedAt?.slice(0, 10) ?? "—"} bis{" "}
                    {t.planning?.plannedTo?.slice(0, 10) ?? "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {isPending ? <div className="text-xs text-zinc-400">Speichern…</div> : null}
      </div>
    </div>
  );
}
