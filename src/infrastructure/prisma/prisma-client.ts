import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  __quanStudioPrisma?: PrismaClient;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

export function getPrismaClient(): PrismaClient {
  if (!globalWithPrisma.__quanStudioPrisma) {
    globalWithPrisma.__quanStudioPrisma = new PrismaClient();
  }

  return globalWithPrisma.__quanStudioPrisma;
}
