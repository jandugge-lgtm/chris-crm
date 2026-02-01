"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../lib/prisma";

async function revalidate(userId: string, boardId?: string) {
  revalidatePath("/");
  revalidatePath(`/cockpit/person/${userId}`);
  if (boardId) {
    revalidatePath(`/boards/${boardId}`);
  }
}

async function hasPlannedToColumn() {
  const rows = await prisma.$queryRaw<
    { exists: boolean }[]
  >`SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'TaskPlanning'
        AND column_name = 'plannedTo'
    ) AS "exists";`;
  return !!rows?.[0]?.exists;
}

export async function updateTaskNotes(userId: string, taskId: string, notes: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { notes: notes.trim() === "" ? null : notes.trim() },
    select: { boardId: true },
  });
  await revalidate(userId, task.boardId);
}

export async function updateTaskPriority(
  userId: string,
  taskId: string,
  priority: "A" | "B" | "C"
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { priority },
    select: { boardId: true },
  });
  await revalidate(userId, task.boardId);
}

export async function updateTaskAssignee(
  userId: string,
  taskId: string,
  assigneeId: string | null
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: assigneeId || null },
    select: { boardId: true },
  });
  await revalidate(userId, task.boardId);
}

export async function moveTaskToColumn(userId: string, taskId: string, columnId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { columnId },
    select: { boardId: true },
  });
  await revalidate(userId, task.boardId);
}

export async function toggleDone(userId: string, taskId: string, done: boolean) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { boardId: true, column: { select: { type: true } } },
  });
  if (!task) return;

  if (done) {
    const doneCol = await prisma.column.findFirst({
      where: {
        boardId: task.boardId,
        OR: [
          { type: "DONE" },
          { name: { contains: "done", mode: "insensitive" } },
          { name: { contains: "erledigt", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (doneCol) {
      await prisma.task.update({ where: { id: taskId }, data: { columnId: doneCol.id } });
    }
  } else {
    const normalCol = await prisma.column.findFirst({
      where: { boardId: task.boardId, type: "NORMAL" },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (normalCol) {
      await prisma.task.update({ where: { id: taskId }, data: { columnId: normalCol.id } });
    }
  }

  await revalidate(userId, task.boardId);
}

export async function setPlanningRange(
  userId: string,
  taskId: string,
  from: string | null,
  to: string | null
) {
  const allowPlannedTo = await hasPlannedToColumn();
  const hasRange = !!from || !!to;

  if (!hasRange) {
    await prisma.taskPlanning.deleteMany({ where: { taskId } });
  } else {
    await prisma.taskPlanning.upsert({
      where: { taskId },
      update: {
        bucket: "WEEK",
        plannedAt: from ? new Date(from) : null,
        ...(allowPlannedTo ? { plannedTo: to ? new Date(to) : null } : {}),
      },
      create: {
        taskId,
        bucket: "WEEK",
        plannedAt: from ? new Date(from) : null,
        ...(allowPlannedTo ? { plannedTo: to ? new Date(to) : null } : {}),
      },
    });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { boardId: true },
  });
  await revalidate(userId, task?.boardId);
}

export async function quickAddTask(input: {
  userId: string;
  title: string;
  boardId: string;
  columnId: string;
  assigneeId: string | null;
  priority: "A" | "B" | "C";
  plannedFrom?: string | null;
  plannedTo?: string | null;
}) {
  const title = input.title.trim();
  if (!title) return;

  const task = await prisma.task.create({
    data: {
      title,
      boardId: input.boardId,
      columnId: input.columnId,
      assigneeId: input.assigneeId || null,
      priority: input.priority,
      position: 0,
    },
    select: { id: true, boardId: true },
  });

  if (input.plannedFrom || input.plannedTo) {
    const allowPlannedTo = await hasPlannedToColumn();
    await prisma.taskPlanning.create({
      data: {
        taskId: task.id,
        bucket: "WEEK",
        plannedAt: input.plannedFrom ? new Date(input.plannedFrom) : null,
        ...(allowPlannedTo ? { plannedTo: input.plannedTo ? new Date(input.plannedTo) : null } : {}),
      },
    });
  }

  await revalidate(input.userId, task.boardId);
}
