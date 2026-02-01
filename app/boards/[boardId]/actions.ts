"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { mergeNotesWithAssignment, parseAssignedBoardId } from "../../../lib/assignment-notes";
import { Priority } from "@prisma/client";

export async function createTask(input: {
  boardId: string;
  title: string;
  notes?: string;
  priority: Priority;
  assigneeId?: string | null;
  columnId: string;
  dueDate?: string | null;
}) {
  const title = input.title.trim();
  if (!title) return;
  const dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null;

  // Neue Tasks kommen ans Ende der Spalte
  const last = await prisma.task.findFirst({
    where: { columnId: input.columnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.task.create({
    data: {
      boardId: input.boardId,
      columnId: input.columnId,
      title,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate,
      position: (last?.position ?? 0) + 1,
    },
  });

  revalidatePath(`/boards/${input.boardId}`);
}

export async function updateTitle(taskId: string, title: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { title: title.trim() || "Ohne Titel" },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function updateNotes(taskId: string, notes: string) {
  const current = await prisma.task.findUnique({
    where: { id: taskId },
    select: { notes: true },
  });
  const { assignedBoardId } = parseAssignedBoardId(current?.notes ?? null);
  const merged = mergeNotesWithAssignment(notes.trim(), assignedBoardId);
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { notes: merged },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function updatePriority(taskId: string, priority: Priority) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { priority },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function updateAssignee(taskId: string, assigneeId: string | null) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: assigneeId || null },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function updateDueDate(taskId: string, dueDate: string | null) {
  const parsed = dueDate ? new Date(`${dueDate}T00:00:00`) : null;
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { dueDate: parsed },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function updatePlayerFlags(
  taskId: string,
  purchasePlayer: boolean,
  leasePlayer: boolean
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { purchasePlayer, leasePlayer },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function upsertMeetingColumn(boardId: string, name: string) {
  const nextName = name.trim();
  if (!nextName) return;

  const existing = await prisma.column.findFirst({
    where: {
      boardId,
      name: { startsWith: "Themen für Meeting am", mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.column.update({
      where: { id: existing.id },
      data: { name: nextName },
    });
    revalidatePath(`/boards/${boardId}`);
    return;
  }

  const last = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.column.create({
    data: {
      boardId,
      name: nextName,
      type: "NORMAL",
      position: (last?.position ?? 0) + 1,
    },
  });

  revalidatePath(`/boards/${boardId}`);
}

export async function moveTask(taskId: string, toColumnId: string) {
  // ans Ende der Zielspalte setzen
  const last = await prisma.task.findFirst({
    where: { columnId: toColumnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: toColumnId,
      position: (last?.position ?? 0) + 1,
    },
    select: { boardId: true },
  });
  revalidatePath(`/boards/${task.boardId}`);
}

export async function updateTaskAssignedBoard(taskId: string, boardId: string | null) {
  const current = await prisma.task.findUnique({
    where: { id: taskId },
    select: { boardId: true, notes: true },
  });
  const { cleanNotes } = parseAssignedBoardId(current?.notes ?? null);
  const merged = mergeNotesWithAssignment(cleanNotes, boardId);
  await prisma.task.update({
    where: { id: taskId },
    data: { notes: merged },
  });
  if (current?.boardId) revalidatePath(`/boards/${current.boardId}`);
}

export async function updateKiKatalogMeta(
  taskId: string,
  _genre: string,
  _songs: string
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { boardId: true },
  });
  if (task?.boardId) revalidatePath(`/boards/${task.boardId}`);
}

export async function toggleDone(taskId: string, done: boolean, doneColumnId: string) {
  if (done) {
    await moveTask(taskId, doneColumnId);
  }
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId }, select: { boardId: true } });
  revalidatePath(`/boards/${task.boardId}`);
}
