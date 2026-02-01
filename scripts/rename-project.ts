import "dotenv/config";
import { prisma } from "../lib/prisma";

const DEFAULT_PROJECT_ID = "cmkws7nbu0001ktvw1cxy2jmm";
const DEFAULT_PROJECT_NAME = "Joyello";

async function main() {
  const projectId = process.argv[2] ?? DEFAULT_PROJECT_ID;
  const newName = process.argv[3] ?? DEFAULT_PROJECT_NAME;

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!existing) {
    console.error(`❌ Projekt nicht gefunden: ${projectId}`);
    process.exitCode = 1;
    return;
  }

  if (existing.name === newName) {
    console.log(`ℹ️ Projekt heißt bereits "${newName}" (${existing.id}).`);
    return;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name: newName },
    select: { id: true, name: true },
  });

  console.log(
    `✅ Projekt umbenannt: "${existing.name}" → "${updated.name}" (${updated.id})`
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
