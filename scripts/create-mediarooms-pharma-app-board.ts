cd ~/Projekte/chris-crm
cat > scripts/create-mediarooms-pharma-app-board.ts << 'EOF'
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL fehlt in deiner .env/.env.local");
  process.exit(1);
}

const prisma = new PrismaClient();

const BOARD_NAME = "Mediarooms – Pharma APP";

const COLUMNS = [
  "Ideen & Input",
  "Content",
  "App Dev",
  "Marketing",
  "Review / Freigabe",
  "Done",
];

async function main() {
  let board = await prisma.board.findFirst({
    where: { name: BOARD_NAME },
    select: { id: true, name: true },
  });

  if (!board) {
    board = await prisma.board.create({
      data: { name: BOARD_NAME },
      select: { id: true, name: true },
    });
    console.log(`✅ Board erstellt: ${board.name} (${board.id})`);
  } else {
    console.log(`ℹ️ Board existiert bereits: ${board.name} (${board.id})`);
  }

  const existing = await prisma.column.findMany({
    where: { boardId: board.id },
    select: { id: true, name: true, position: true },
  });

  const existingByName = new Map(existing.map((c) => [c.name, c]));

  for (let i = 0; i < COLUMNS.length; i++) {
    const name = COLUMNS[i];
    const position = i + 1;

    const found = existingByName.get(name);

    if (!found) {
      await prisma.column.create({
        data: {
          boardId: board.id,
          name,
          position,
        },
      });
      console.log(`➕ Spalte angelegt: ${position}. ${name}`);
    } else if (found.position !== position) {
      await prisma.column.update({
        where: { id: found.id },
        data: { position },
      });
      console.log(`↕️ Spalte sortiert: ${position}. ${name}`);
    } else {
      console.log(`✅ Spalte ok: ${position}. ${name}`);
    }
  }

  console.log("\n🎉 Fertig!");
  console.log(`➡️ Öffne das Board unter: /boards/${board.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
