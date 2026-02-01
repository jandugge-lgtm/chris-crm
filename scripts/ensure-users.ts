import "dotenv/config";
import { prisma } from "../lib/prisma";

const names = ["Jan", "Chris", "Lenni", "Iggy"];

async function main() {
  console.log("▶️ Ensure users:", names.join(", "));

  for (const name of names) {
    const existing = await prisma.user.findFirst({ where: { name } });
    if (existing) {
      console.log(`✅ Exists: ${name}`);
      continue;
    }
    await prisma.user.create({ data: { name } });
    console.log(`🆕 Created: ${name}`);
  }

  console.log("✅ Done.");
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
