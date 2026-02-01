const ASSIGN_PREFIX = "[assign-board:";

export function parseAssignedBoardId(notes: string | null | undefined) {
  const raw = notes ?? "";
  const idx = raw.lastIndexOf(ASSIGN_PREFIX);
  if (idx === -1) {
    return { cleanNotes: raw, assignedBoardId: null as string | null };
  }

  const end = raw.indexOf("]", idx + ASSIGN_PREFIX.length);
  if (end === -1) {
    return { cleanNotes: raw, assignedBoardId: null as string | null };
  }

  const id = raw.slice(idx + ASSIGN_PREFIX.length, end).trim();
  const clean = raw.slice(0, idx).trimEnd();
  return { cleanNotes: clean, assignedBoardId: id || null };
}

export function mergeNotesWithAssignment(
  cleanNotes: string,
  assignedBoardId: string | null
) {
  const base = cleanNotes.trim();
  if (!assignedBoardId) return base || null;
  const suffix = `${ASSIGN_PREFIX}${assignedBoardId}]`;
  if (!base) return suffix;
  return `${base}\n\n${suffix}`;
}
