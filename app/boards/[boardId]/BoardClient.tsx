"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "./TaskCard";
import { createTask, upsertMeetingColumn } from "./actions";

type User = { id: string; name: string };
type Column = { id: string; name: string; type: string; position: number };
type Priority = "A" | "B" | "C";
type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  assigneeId: string | null;
  columnId: string;
  position: number;
  createdAt: string;
  dueDate: string | null;
  purchasePlayer: boolean;
  leasePlayer: boolean;
  assignedBoardId: string | null;
};

type Filter = "open" | "done" | "deferred" | "blocked" | "all";

export default function BoardClient({
  boardId,
  boardName,
  columns,
  tasks,
  users,
  assignmentBoardsByProject,
}: {
  boardId: string;
  boardName: string;
  columns: Column[];
  tasks: Task[];
  users: User[];
  assignmentBoardsByProject?: Record<string, { id: string; name: string }[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isPlayerBestellungen = /player.*bestell/i.test(boardName);
  const isTeamCockpit = /team cockpit/i.test(boardName);
  const isOrganisation = /organisation/i.test(boardName);
  const columnsForUi = useMemo(() => {
    if (!isPlayerBestellungen) return columns;
    const wanted = ["bestellungen", "in vorbereitung", "versendet"];
    return columns.filter((c) => wanted.includes(c.name.toLowerCase()));
  }, [columns, isPlayerBestellungen]);
  const organisationColumnsForUi = useMemo(() => {
    if (!isOrganisation) return columnsForUi;
    const allowed = ["audiorooms", "tunebob", "mediarooms", "joyello"];
    return columnsForUi.filter((c) => allowed.includes(c.name.toLowerCase()));
  }, [columnsForUi, isOrganisation]);
  const meetingColumn = useMemo(
    () =>
      columns.find((c) => c.name.toLowerCase().startsWith("themen für meeting am")) ??
      null,
    [columns]
  );

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("B");
  const [dueDate, setDueDate] = useState("");
  const [meetingName, setMeetingName] = useState<string>(
    meetingColumn?.name ?? "Themen für Meeting am "
  );
  const inboxColumnId = useMemo(() => {
    const source = organisationColumnsForUi.length ? organisationColumnsForUi : columnsForUi.length ? columnsForUi : columns;
    const byName = (name: string) => source.find((c) => c.name.toLowerCase() === name);
    const bestellungen = byName("bestellungen");
    const inbox = byName("inbox");
    return bestellungen?.id ?? inbox?.id ?? source[0]?.id ?? "";
  }, [columns, columnsForUi, organisationColumnsForUi]);

  useEffect(() => {
    if (meetingColumn?.name) setMeetingName(meetingColumn.name);
  }, [meetingColumn?.name]);

  const [columnId, setColumnId] = useState<string>(inboxColumnId);
  const [filter, setFilter] = useState<Filter>("open");
  const [monthFilter, setMonthFilter] = useState("");

  const doneColumn = useMemo(
    () =>
      columns.find((c) => c.type === "DONE") ??
      columns.find((c) => c.name.toLowerCase().includes("done")) ??
      columns.find((c) => c.name.toLowerCase().includes("erledigt")),
    [columns]
  );
  const blockedColumn = useMemo(
    () =>
      columns.find((c) => c.type === "BLOCKED") ??
      columns.find((c) => c.name.toLowerCase().includes("rücksprache")) ??
      columns.find((c) => c.name.toLowerCase().includes("ruecksprache")) ??
      columns.find((c) => c.name.toLowerCase().includes("blocked")),
    [columns]
  );
  const deferredColumn = useMemo(
    () =>
      columns.find((c) => c.type === "DEFERRED") ??
      columns.find((c) => c.name.toLowerCase().includes("verschoben")) ??
      columns.find((c) => c.name.toLowerCase().includes("deferred")),
    [columns]
  );

  const doneColumnId = doneColumn?.id ?? "";
  const blockedColumnId = blockedColumn?.id ?? "";
  const deferredColumnId = deferredColumn?.id ?? "";

  const visibleTasks = useMemo(() => {
    let filtered = tasks;
    if (filter === "done") filtered = doneColumnId ? tasks.filter((t) => t.columnId === doneColumnId) : [];
    if (filter === "blocked")
      filtered = blockedColumnId ? tasks.filter((t) => t.columnId === blockedColumnId) : [];
    if (filter === "deferred")
      filtered = deferredColumnId ? tasks.filter((t) => t.columnId === deferredColumnId) : [];
    if (filter === "open") {
      const hidden = new Set(
        [doneColumnId, blockedColumnId, deferredColumnId].filter(Boolean) as string[]
      );
      filtered = tasks.filter((t) => !hidden.has(t.columnId));
    }

    if (!monthFilter) return filtered;
    const [yearStr, monthStr] = monthFilter.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    return filtered.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
    });
  }, [
    tasks,
    filter,
    doneColumnId,
    blockedColumnId,
    deferredColumnId,
    monthFilter,
  ]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const c of organisationColumnsForUi) map.set(c.id, []);
    for (const t of visibleTasks) map.get(t.columnId)?.push(t);
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.position - b.position);
      map.set(k, arr);
    }
    return map;
  }, [organisationColumnsForUi, visibleTasks]);

  return (
    <div className="space-y-6">
      {/* Neue Aufgabe */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 text-sm font-semibold text-zinc-100">Aufgabe erstellen</div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Aufgabe…"
            className="lg:col-span-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
          />

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notiz (optional)…"
            className="lg:col-span-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="lg:col-span-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
          />

          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="lg:col-span-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Zuweisung…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="lg:col-span-1 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>

          <select
            value={columnId}
            onChange={(e) => setColumnId(e.target.value)}
            className="lg:col-span-1 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          >
            {organisationColumnsForUi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              startTransition(async () => {
                if (!title.trim()) return;
                await createTask({
                  boardId,
                  title,
                  notes,
                  priority,
                  assigneeId: assigneeId || null,
                  columnId,
                  dueDate: dueDate || null,
                });
                setTitle("");
                setNotes("");
                setDueDate("");
                router.refresh();
              })
            }
            className="lg:col-span-12 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:border-sky-500/70"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["open", "Offen"],
          ["blocked", "Rücksprache"],
          ["done", "Erledigt"],
          ["deferred", "Verschoben"],
          ["all", "Alle"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k as Filter)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              filter === k
                ? "border-sky-500/70 bg-sky-500/10 text-sky-200"
                : "border-zinc-800 bg-black text-zinc-200 hover:border-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-2 flex items-center gap-2">
          <label className="text-xs text-zinc-400">Fällig im Monat</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
          />
          {monthFilter ? (
            <button
              onClick={() => setMonthFilter("")}
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700"
            >
              Reset
            </button>
          ) : null}
        </div>
        {isPending ? <span className="ml-2 text-xs text-zinc-500">speichere…</span> : null}
      </div>

      {isTeamCockpit ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-2 text-sm font-semibold text-zinc-100">Meeting-Spalte</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="Themen für Meeting am 31.01.2026"
              className="min-w-[260px] flex-1 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
            />
            <button
              onClick={() =>
                startTransition(async () => {
                  await upsertMeetingColumn(boardId, meetingName);
                  router.refresh();
                })
              }
              className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:border-sky-500/70"
            >
              Spaltenname speichern
            </button>
          </div>
        </div>
      ) : null}

      {/* Spalten */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {organisationColumnsForUi.map((col) => (
          <section key={col.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">{col.name}</h3>
              <span className="text-xs text-zinc-500">
                {(tasksByColumn.get(col.id)?.length ?? 0)} Karten
              </span>
            </div>

            <div className="space-y-3">
              {(tasksByColumn.get(col.id) ?? []).map((t) => (
                <TaskCard
                  key={t.id}
                  task={{
                    id: t.id,
                    title: t.title,
                    notes: t.notes,
                    priority: t.priority,
                    assigneeId: t.assigneeId,
                    columnId: t.columnId,
                    dueDate: t.dueDate,
                    purchasePlayer: t.purchasePlayer,
                    leasePlayer: t.leasePlayer,
                    assignedBoardId: t.assignedBoardId,
                  }}
                  users={users}
                  columns={organisationColumnsForUi.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
                  doneColumnId={doneColumnId}
                  boardName={boardName}
                  assignmentBoardsByProject={assignmentBoardsByProject}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
