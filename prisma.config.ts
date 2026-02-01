// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // Migrate/Generate holen sich die DB-URL hierher (Prisma 7)
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    // Seed nur falls du ihn nutzt
    seed: "tsx prisma/seed.ts",
  },
});
