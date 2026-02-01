"use client";

import { useMemo, useState, useTransition } from "react";
import {
  moveTaskToColumn,
  quickAddTask,
  setPlanningBucket,
  toggleDone,
  updateTaskAssignee,
  updateTaskNotes,
  updateTaskPriority,
} from "./cockpitActions";

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
  planning: { bucket: "NONE" | "TODAY" | "WEEK" | "NEXT"; plannedAt: string | null } | null;
};

const prioClass = (p: "A" | "B" | "C") =>
  p === "A" ? "border-red-500/60" : p === "B" ? "border-orange-400/60" : "border-sky-500/60";

const prioDot = (p: "A" | "B" | "C") =>
  p === "A" ? "bg-red-500" : p === "B" ? "bg-orange-400" : "bg-sky-500";

export default function CockpitClient({
  cockpitBoardId,
  users,
  boards,
  tasks,
}: {
  cockpitBoardId: string;
  users: User[];
  boards: Board[];
  tasks: Task[];
}) {
  const [isPending, startTransition] = useTransition();

  // Filters
  const [assignee, setAssignee] = useState<string>("ALL");
  const [prio, setPrio] = useState<"ALL" | "A" | "B" | "C">("ALL");
  const [status, setStatus] = useState<"OPEN" | "DONE">("OPEN");

  // Quick add
  const defaultTargetBoard = boards.find((b) => b.id !== cockpitBoardId) ?? boards[0];
  const [qaTitle, setQaTitle] = useState("");
  const [qaBoardId, setQaBoardId] = useState(defaultTargetBoard?.id ?? "");
  const [qaColumnId, setQaColumnId] = useState(defaultTargetBoard?.columns?.[0]?.id ?? "");
  const [qaAssigneeId, setQaAssigneeId] = useState<string>(""); // empty = null
  const [qaPrio, setQaPrio] = useState<"A" | "B" | "C">("B");
  const [qaBucket, setQaBucket] = useState<"NONE" | "TODAY" | "WEEK" | "NEXT">("NONE");

  const selectedBoard = useMemo(() => boards.find((b) => b.id === qaBoardId), [boards, qaBoardId]);

  // Keep column in sync when board changes
  const columnsForSelectedBoard = selectedBoard?.columns ?? [];
  const safeColumnId = columnsForSelectedBoard.some((c) => c.id === qaColumnId)
    ? qaColumnId
    : columnsForSelectedBoard[0]?.id ?? "";

  // Derived lists (Cockpit buckets + Rücksprache + Done)
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const isDone = t.column.type === "DONE";
      if (status === "OPEN" && isDone) return false;
      if (status === "DONE" && !isDone) return false;

      if (assignee !== "ALL" && (t.assigneeId ?? "") !== assignee) return false;
      if (prio !== "ALL" && t.priority !== prio) return false;

      return true;
    });
  }, [tasks, assignee, prio, status]);

  const bucketOf = (t: Task) => t.planning?.bucket ?? "NONE";

  const lists = useMemo(() => {
    const today = filtered.filter((t) => bucketOf(t) === "TODAY" && t.column.type !== "DONE");
    const week = filtered.filter((t) => bucketOf(t) === "WEEK" && t.column.type !== "DONE");
    const next = filtered.filter((t) => bucketOf(t) === "NEXT" && t.column.type !== "DONE");
    const open = filtered.filter((t) => bucketOf(t) === "NONE" && t.column.type !== "DONE");
    const ruecksprache = filtered.filter((t) => t.column.type === "BLOCKED");
    const done = filtered.filter((t) => t.column.type === "DONE");

    return { today, week, next, open, ruecksprache, done };
  }, [filtered]);

  function TaskCard({ t }: { t: Task }) {
    const isDone = t.column.type === "DONE";

    return (
      <div
        className={`rounded-xl border bg-zinc-900/70 p-4 ${prioClass(t.priority)} hover:bg-zinc-900`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${prioDot(t.priority)}`} />
              <div className="truncate text-base font-semibold">{t.title}</div>
            </div>

            <div className="mt-1 text-xs text-zinc-400">
              {t.board.area.project.name} · {t.board.name} · {t.column.name}
            </div>
          </div>

          {/* Erledigt Checkbox */}
          <button
            onClick={() =>
              startTransition(async () => {
                await toggleDone(t.id, !isDone);
              })
            }
            className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${
              isDone
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-emerald-500/50"
            }`}
            title="Erledigt"
          >
            {isDone ? "✔ Erledigt" : "☐ Erledigt"}
          </button>
        </div>

        {/* Notizen */}
        <div className="mt-3">
          <label className="mb-1 block text-xs text-zinc-400">Notiz</label>
          <textarea
            defaultValue={t.notes ?? ""}
            placeholder="Notiz…"
            className="w-full rounded-lg border border-zinc-800 bg-black/30 p-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
            rows={3}
            onBlur={(e) =>
              startTransition(async () => {
                await updateTaskNotes(t.id, e.target.value);
              })
            }
          />
        </div>

        {/* Controls */}
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-zinc-400">Zuweisung</div>
            <select
              defaultValue={t.assigneeId ?? ""}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-sky-500/60"
              onChange={(e) =>
                startTransition(async () => {
                  await updateTaskAssignee(t.id, e.target.value || null);
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
                  await updateTaskPriority(t.id, e.target.value as any);
                })
              }
            >
              <option value="A">A (hoch)</option>
              <option value="B">B (mittel)</option>
              <option value="C">C (niedrig)</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-zinc-400">Cockpit Planung</div>
            <select
              defaultValue={t.planning?.bucket ?? "NONE"}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-sky-500/60"
              onChange={(e) =>
                startTransition(async () => {
                  await setPlanningBucket(t.id, e.target.value as any);
                })
              }
            >
              <option value="NONE">—</option>
              <option value="TODAY">Heute</option>
              <option value="WEEK">Diese Woche</option>
              <option value="NEXT">Später</option>
            </select>
          </div>
        </div>

        {/* Move Column */}
        <div className="mt-3">
          <div className="mb-1 text-xs text-zinc-400">Liste / Spalte (im Original-Board)</div>
          <select
            defaultValue={t.columnId}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-sky-500/60"
            onChange={(e) =>
              startTransition(async () => {
                await moveTaskToColumn(t.id, e.target.value);
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Add */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 text-sm font-semibold text-zinc-200">Neue Aufgabe (Quick Add)</div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input
            value={qaTitle}
            onChange={(e) => setQaTitle(e.target.value)}
            placeholder="Aufgabe…"
            className="lg:col-span-4 rounded-xl border border-zinc-800 bg-black/30 px-3 py-3 text-sm outline-none focus:border-sky-500/60"
          />

          <select
            value={qaBoardId}
            onChange={(e) => {
              setQaBoardId(e.target.value);
              const b = boards.find((x) => x.id === e.target.value);
              setQaColumnId(b?.columns?.[0]?.id ?? "");
            }}
            className="lg:col-span-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-sky-500/60"
          >
            {boards
              .filter((b) => b.id !== cockpitBoardId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.area.project.name} · {b.name}
                </option>
              ))}
          </select>

          <select
            value={safeColumnId}
            onChange={(e) => setQaColumnId(e.target.value)}
            className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-sky-500/60"
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
            className="lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-sky-500/60"
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
            className="lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-sky-500/60"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>

          <select
            value={qaBucket}
            onChange={(e) => setQaBucket(e.target.value as any)}
            className="lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-sky-500/60"
          >
            <option value="NONE">—</option>
            <option value="TODAY">Heute</option>
            <option value="WEEK">Woche</option>
            <option value="NEXT">Später</option>
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Speichert direkt ins gewählte Projekt-Board (sync).
          </div>

          <button
            onClick={() =>
              startTransition(async () => {
                await quickAddTask({
                  title: qaTitle,
                  boardId: qaBoardId,
                  columnId: safeColumnId,
                  assigneeId: qaAssigneeId || null,
                  priority: qaPrio,
                  bucket: qaBucket,
                });
                setQaTitle("");
              })
            }
            className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:border-sky-400/60"
          >
            + Erstellen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
        >
          <option value="ALL">Alle Zuständigen</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={prio}
          onChange={(e) => setPrio(e.target.value as any)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
        >
          <option value="ALL">Alle Prioritäten</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500/60"
        >
          <option value="OPEN">Offen</option>
          <option value="DONE">Erledigt</option>
        </select>

        {isPending ? <div className="text-xs text-zinc-400">Speichern…</div> : null}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Section title="Heute" items={lists.today} />
        <Section title="Diese Woche" items={lists.week} />
        <Section title="Später" items={lists.next} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Offen (ohne Planung)" items={lists.open} />
        <Section title="Rücksprache" items={lists.ruecksprache} />
      </div>

      {status === "DONE" ? (
        <Section title="Erledigt" items={lists.done} />
      ) : null}

      <div className="text-xs text-zinc-500">
        Hinweis: Änderungen hier wirken direkt auf die Original-Tasks (Sync mit Boards).
      </div>

      {/* Section component inline */}
      {null}
    </div>
  );

  function Section({ title, items }: { title: string; items: Task[] }) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-200">{title}</div>
          <div className="text-xs text-zinc-400">{items.length}</div>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-500">
              Keine Aufgaben
            </div>
          ) : (
            items.map((t) => <TaskCard key={t.id} t={t} />)
          )}
        </div>
      </div>
    );
  }
}
