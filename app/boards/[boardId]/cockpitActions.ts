"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";

export async function setPlanningBucket(taskId: string, bucket: "NONE" | "TODAY" | "WEEK" | "NEXT") {
  await prisma.taskPlanning.upsert({
    where: { taskId },
    update: { bucket },
    create: { taskId, bucket },
  });

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}

export async function updateTaskNotes(taskId: string, notes: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { notes: notes.trim() === "" ? null : notes },
  });

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}

export async function updateTaskPriority(taskId: string, priority: "A" | "B" | "C") {
  await prisma.task.update({
    where: { id: taskId },
    data: { priority },
  });

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}

export async function updateTaskAssignee(taskId: string, assigneeId: string | null) {
  await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: assigneeId || null },
  });

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}

export async function moveTaskToColumn(taskId: string, columnId: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { columnId },
  });

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}

// ✅ "Erledigt" = verschiebe Task auf DONE-Spalte seines Boards (wenn vorhanden)
export async function toggleDone(taskId: string, done: boolean) {
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
    // zurück in erste NORMAL-Spalte
    const normalCol = await prisma.column.findFirst({
      where: { boardId: task.boardId, type: "NORMAL" },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (normalCol) {
      await prisma.task.update({ where: { id: taskId }, data: { columnId: normalCol.id } });
    }
  }

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}

export async function quickAddTask(input: {
  title: string;
  boardId: string;
  columnId: string;
  assigneeId: string | null;
  priority: "A" | "B" | "C";
  bucket: "NONE" | "TODAY" | "WEEK" | "NEXT";
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
    select: { id: true },
  });

  if (input.bucket !== "NONE") {
    await prisma.taskPlanning.create({
      data: { taskId: task.id, bucket: input.bucket },
    });
  }

  revalidatePath("/");
  revalidatePath("/boards/[boardId]", "page");
}
