import "dotenv/config";
import { prisma } from "../lib/prisma";

const DEFAULT_BOARD_ID = "cmkws7nbu0001ktvw1cxy2jmm";
const DEFAULT_BOARD_NAME = "Joyello";

async function main() {
  const boardId = process.argv[2] ?? DEFAULT_BOARD_ID;
  const newName = process.argv[3] ?? DEFAULT_BOARD_NAME;

  const existing = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, name: true },
  });

  if (!existing) {
    console.error(`❌ Board nicht gefunden: ${boardId}`);
    process.exitCode = 1;
    return;
  }

  if (existing.name === newName) {
    console.log(`ℹ️ Board heißt bereits "${newName}" (${existing.id}).`);
    return;
  }

  const updated = await prisma.board.update({
    where: { id: boardId },
    data: { name: newName },
    select: { id: true, name: true },
  });

  console.log(
    `✅ Board umbenannt: "${existing.name}" → "${updated.name}" (${updated.id})`
  );
}

main()
  .catch((err) => {
    console.error("❌ Fehler:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
