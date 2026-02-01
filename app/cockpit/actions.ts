"use server";

import { prisma } from "../../lib/prisma";
import { Priority, PlannedBucket } from "@prisma/client";

export async function setPlanning(taskId: string, bucket: PlannedBucket) {
  await prisma.taskPlanning.upsert({
    where: { taskId },
    update: { bucket, plannedAt: bucket === "NONE" ? null : new Date() },
    create: { taskId, bucket, plannedAt: bucket === "NONE" ? null : new Date() },
  });
}

export async function setAssignee(taskId: string, assigneeId: string | null) {
  await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: assigneeId || null },
  });
}

export async function setPriority(taskId: string, priority: Priority) {
  await prisma.task.update({
    where: { id: taskId },
    data: { priority },
  });
}

export async function setNotes(taskId: string, notes: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { notes: notes.trim() === "" ? null : notes },
  });
}

export async function moveTask(taskId: string, columnId: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { columnId },
  });
}
