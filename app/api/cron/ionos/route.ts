import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

type EnvConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  folder: string;
  boardId: string;
  columnName: string;
  cronSecret?: string;
};

function getConfig(): EnvConfig {
  const host = process.env.IONOS_IMAP_HOST ?? "";
  const port = Number(process.env.IONOS_IMAP_PORT ?? "993");
  const secure = (process.env.IONOS_IMAP_TLS ?? "true") === "true";
  const user = process.env.IONOS_IMAP_USER ?? "";
  const pass = process.env.IONOS_IMAP_PASS ?? "";
  const folder = process.env.IONOS_FOLDER ?? "INBOX";
  const boardId = process.env.MAIL_BOARD_ID ?? "";
  const columnName = process.env.MAIL_COLUMN_NAME ?? "Posteingang";
  const cronSecret = process.env.CRON_SECRET;

  if (!host || !user || !pass || !boardId || !columnName) {
    throw new Error("Missing required mail env vars.");
  }

  return { host, port, secure, user, pass, folder, boardId, columnName, cronSecret };
}

function getAuthHeader(request: Request) {
  return request.headers.get("authorization") ?? "";
}

async function handle(request: Request) {
  const cfg = getConfig();
  if (cfg.cronSecret) {
    const auth = getAuthHeader(request);
    if (auth !== `Bearer ${cfg.cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const board = await prisma.board.findUnique({
    where: { id: cfg.boardId },
    include: { columns: true },
  });
  if (!board) {
    return NextResponse.json({ ok: false, error: "Board not found" }, { status: 404 });
  }

  const column = board.columns.find(
    (c) => c.name.toLowerCase() === cfg.columnName.toLowerCase()
  );
  if (!column) {
    return NextResponse.json(
      { ok: false, error: `Column not found: ${cfg.columnName}` },
      { status: 404 }
    );
  }

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  let created = 0;
  let skipped = 0;
  let processed = 0;

  await client.connect();
  const lock = await client.getMailboxLock(cfg.folder);
  try {
    const uids = await client.search({ seen: false });
    const recent = uids.slice(-50);

    if (recent.length === 0) {
      return NextResponse.json({ ok: true, created, skipped, processed });
    }

    const last = await prisma.task.findFirst({
      where: { columnId: column.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let pos = (last?.position ?? 0) + 1;

    for await (const msg of client.fetch(recent, { uid: true, envelope: true, source: true })) {
      processed += 1;
      const messageId = msg.envelope?.messageId ?? null;
      const marker = messageId ? `[email-id:${messageId}]` : `[email-uid:${msg.uid}]`;

      const existing = await prisma.task.findFirst({
        where: { boardId: board.id, notes: { contains: marker } },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const parsed = await simpleParser(msg.source);
      const subject = parsed.subject?.trim() || "(ohne Betreff)";
      const to = parsed.to?.text ?? "";
      const from = parsed.from?.text ?? "";

      const notesParts = [];
      if (to) notesParts.push(`An: ${to}`);
      if (from) notesParts.push(`Von: ${from}`);
      notesParts.push("");
      notesParts.push(marker);
      const notes = notesParts.join("\n").trim();

      await prisma.task.create({
        data: {
          boardId: board.id,
          columnId: column.id,
          title: subject,
          notes,
          position: pos++,
        },
      });

      await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
      created += 1;
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return NextResponse.json({ ok: true, created, skipped, processed });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
