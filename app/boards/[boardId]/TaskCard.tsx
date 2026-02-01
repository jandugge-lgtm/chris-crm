"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAssignee,
  updateNotes,
  updatePriority,
  updateTitle,
  moveTask,
  deleteTask,
  updateDueDate,
  updatePlayerFlags,
  updateTaskAssignedBoard,
} from "./actions";

type User = { id: string; name: string };
type Column = { id: string; name: string; type: string };
type Priority = "A" | "B" | "C";
type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  assigneeId: string | null;
  columnId: string;
  dueDate: string | null;
  purchasePlayer: boolean;
  leasePlayer: boolean;
  assignedBoardId: string | null;
};

export default function TaskCard({
  task,
  users,
  columns,
  doneColumnId,
  boardName,
  assignmentBoardsByProject,
  onDeleted,
}: {
  task: Task;
  users: User[];
  columns: Column[];
  doneColumnId: string;
  boardName: string;
  assignmentBoardsByProject?: Record<string, { id: string; name: string }[]>;
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [purchasePlayer, setPurchasePlayer] = useState(!!task.purchasePlayer);
  const [leasePlayer, setLeasePlayer] = useState(!!task.leasePlayer);
  const [assignedBoardId, setAssignedBoardId] = useState(task.assignedBoardId ?? "");
  const router = useRouter();

  const prioBorder = useMemo(() => {
    if (task.priority === "A") return "border-red-500/70";
    if (task.priority === "B") return "border-orange-400/70";
    return "border-sky-500/60";
  }, [task.priority]);

  const isDone = task.columnId === doneColumnId;
  const canToggleDone = !!doneColumnId;
  const showPlayerFlags = /player.*bestell/i.test(boardName);
  const isOrganisation = /organisation/i.test(boardName);
  const currentColumnName = useMemo(
    () => columns.find((c) => c.id === task.columnId)?.name ?? "",
    [columns, task.columnId]
  );
  const assignmentKey = currentColumnName.toLowerCase();
  const assignmentOptions = assignmentBoardsByProject?.[assignmentKey] ?? [];
  const showAssignment = isOrganisation && assignmentOptions.length > 0;

  useEffect(() => {
    setAssignedBoardId(task.assignedBoardId ?? "");
  }, [task.assignedBoardId]);
  const bestellungenColumnId = useMemo(
    () => columns.find((c) => c.name.toLowerCase().includes("bestell"))?.id ?? "",
    [columns]
  );
  const inVorbereitungColumnId = useMemo(
    () => columns.find((c) => c.name.toLowerCase().includes("vorbereitung"))?.id ?? "",
    [columns]
  );
  const versendetColumnId = useMemo(
    () => columns.find((c) => c.name.toLowerCase().includes("versendet"))?.id ?? "",
    [columns]
  );
  const isInVorbereitung = !!inVorbereitungColumnId && task.columnId === inVorbereitungColumnId;
  const isVersendet = !!versendetColumnId && task.columnId === versendetColumnId;

  return (
    <div className={`rounded-xl border ${prioBorder} bg-zinc-950/60 p-4`}>
      {/* Titel */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() =>
          startTransition(async () => {
            await updateTitle(task.id, title);
          })
        }
        className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm font-semibold text-white outline-none focus:border-sky-500/60"
      />

      {/* Notiz direkt darunter */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() =>
          startTransition(async () => {
            await updateNotes(task.id, notes);
          })
        }
        rows={3}
        placeholder="Notiz…"
        className="mt-3 w-full resize-none rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/60"
      />

      {/* Einstellungen */}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-xs text-zinc-400">
          Zuweisung
          <select
            defaultValue={task.assigneeId ?? ""}
            onChange={(e) =>
              startTransition(async () => {
                await updateAssignee(task.id, e.target.value || null);
              })
            }
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-zinc-400">
          Priorität
          <select
            defaultValue={task.priority}
            onChange={(e) =>
              startTransition(async () => {
                await updatePriority(task.id, e.target.value as Priority);
              })
            }
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          >
            <option value="A">A (hoch)</option>
            <option value="B">B (mittel)</option>
            <option value="C">C (normal)</option>
          </select>
        </label>

        <label className="text-xs text-zinc-400">
          Zu erledigen bis
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={() =>
              startTransition(async () => {
                await updateDueDate(task.id, dueDate || null);
              })
            }
            placeholder="YYYY-MM-DD"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          />
        </label>

        {showAssignment ? (
          <label className="text-xs text-zinc-400 md:col-span-2">
            Zuweisung ({currentColumnName})
            <select
              value={assignedBoardId}
              onChange={(e) => {
                const next = e.target.value;
                setAssignedBoardId(next);
                startTransition(async () => {
                  await updateTaskAssignedBoard(task.id, next || null);
                });
              }}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">—</option>
              {assignmentOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showPlayerFlags ? (
          <label className="text-xs text-zinc-400 md:col-span-2">
            Player-Typ
            <div className="mt-1 flex flex-wrap gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={purchasePlayer}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setPurchasePlayer(next);
                    startTransition(async () => {
                      await updatePlayerFlags(task.id, next, leasePlayer);
                    });
                  }}
                  className="h-4 w-4 accent-emerald-400"
                />
                Kaufplayer
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leasePlayer}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setLeasePlayer(next);
                    startTransition(async () => {
                      await updatePlayerFlags(task.id, purchasePlayer, next);
                    });
                  }}
                  className="h-4 w-4 accent-emerald-400"
                />
                Leihplayer
              </label>
            </div>
          </label>
        ) : null}

        {showPlayerFlags ? (
          <label className="text-xs text-zinc-400 md:col-span-2">
            Status
            <div className="mt-1 flex flex-wrap gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isInVorbereitung}
                  onChange={(e) => {
                    if (!inVorbereitungColumnId) return;
                    const next = e.target.checked;
                    startTransition(async () => {
                      if (next) {
                        await moveTask(task.id, inVorbereitungColumnId);
                      } else if (bestellungenColumnId) {
                        await moveTask(task.id, bestellungenColumnId);
                      }
                      router.refresh();
                    });
                  }}
                  className="h-4 w-4 accent-amber-400"
                />
                In Vorbereitung
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isVersendet}
                  onChange={(e) => {
                    if (!versendetColumnId) return;
                    const next = e.target.checked;
                    startTransition(async () => {
                      if (next) {
                        await moveTask(task.id, versendetColumnId);
                      } else if (bestellungenColumnId) {
                        await moveTask(task.id, bestellungenColumnId);
                      }
                      router.refresh();
                    });
                  }}
                  className="h-4 w-4 accent-emerald-400"
                />
                Versendet
              </label>
            </div>
          </label>
        ) : null}

        <label className="text-xs text-zinc-400 md:col-span-2">
          Liste
          <select
            defaultValue={task.columnId}
            onChange={(e) =>
              startTransition(async () => {
                await moveTask(task.id, e.target.value);
              })
            }
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100"
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Erledigt + Löschen */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() =>
            startTransition(async () => {
              // Erledigt = in Done-Spalte verschieben
              if (!doneColumnId) return;
              await moveTask(task.id, doneColumnId);
              router.refresh();
            })
          }
          disabled={!canToggleDone}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            isDone
              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
              : "border-zinc-800 bg-black text-zinc-100 hover:border-emerald-500/40"
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
              isDone ? "border-emerald-500/60 bg-emerald-500/30" : "border-zinc-700 bg-zinc-950"
            }`}
          >
            {isDone ? "✓" : ""}
          </span>
          Erledigt
        </button>

        <button
          onClick={() =>
            startTransition(async () => {
              await deleteTask(task.id);
              onDeleted?.();
              router.refresh();
            })
          }
          className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 hover:border-red-500/50 hover:text-red-200"
        >
          Löschen
        </button>
      </div>

      {isPending ? <div className="mt-2 text-xs text-zinc-500">speichere…</div> : null}
    </div>
  );
}
