import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wir brauchen rohen SQL, weil Prisma den Enum-Wert BLOCKED nicht mehr kennt.
  // Das Statement ersetzt BLOCKED -> NORMAL in der Column-Tabelle.
  const res = await prisma.$executeRawUnsafe(`
    UPDATE "Column"
    SET "type" = 'NORMAL'
    WHERE "type" = 'BLOCKED';
  `);

  console.log(`✅ Aktualisiert: ${res} Spalten von BLOCKED -> NORMAL`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  