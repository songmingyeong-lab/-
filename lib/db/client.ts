import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/validation/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient() {
  const connectionString = getDatabaseUrl("runtime");
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return globalForPrisma.prisma;
}
