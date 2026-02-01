import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Prisma kann die alten Enum-Werte nicht mehr mappen (BLOCKED/DEFERRED/DONE etc.)
  // Daher per Raw SQL: alles was NICHT NORMAL ist -> NORMAL.
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Column"
    SET "type" = 'NORMAL'
    WHERE "type" <> 'NORMAL';
  `);

  console.log(`✅ Column.type bereinigt: ${updated} Zeilen auf NORMAL gesetzt`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
