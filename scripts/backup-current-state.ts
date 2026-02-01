import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();

async function main() {
  console.log("▶️ Backup startet …");

  const data = {
    exportedAt: new Date().toISOString(),
    projects: await prisma.project.findMany({
      include: {
        areas: {
          include: {
            boards: {
              include: {
                columns: {
                  orderBy: { position: "asc" },
                },
                tasks: {
                  orderBy: [
                    { columnId: "asc" },
                    { position: "asc" },
                    { createdAt: "asc" },
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    users: await prisma.user.findMany({
      orderBy: { name: "asc" },
    }),
  };

  const file = `backup-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;

  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

  console.log(`✅ Backup erstellt: ${file}`);
}

main()
  .catch((e) => {
    console.error("❌ Backup fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
