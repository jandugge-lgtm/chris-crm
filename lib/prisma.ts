import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const useDirect = process.env.PRISMA_FORCE_DIRECT === "1";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    useDirect
      ? ({ datasourceUrl: process.env.DATABASE_URL } as any)
      : ({ accelerateUrl: process.env.PRISMA_DATABASE_URL } as any)
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
