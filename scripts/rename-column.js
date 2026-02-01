const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const res = await prisma.column.updateMany({
    where: { name: { contains: "Warten auf" } },
    data: { name: "Rücksprache" },
  });

  console.log("✅ Umbenannt:", res);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
