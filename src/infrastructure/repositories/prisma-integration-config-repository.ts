import type { IntegrationConfig, IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import { getPrismaClient } from "@/infrastructure/prisma/prisma-client";

export class PrismaIntegrationConfigRepository implements IntegrationConfigRepository {
  async findByKey(key: IntegrationConfigKey): Promise<IntegrationConfig | null> {
    const row = await getPrismaClient().integrationConfig.findUnique({
      where: { key },
    });

    return row ? toDomain(row) : null;
  }

  async findByKeys(keys: IntegrationConfigKey[]): Promise<IntegrationConfig[]> {
    if (keys.length === 0) {
      return [];
    }

    const rows = await getPrismaClient().integrationConfig.findMany({
      where: { key: { in: keys } },
    });

    return rows.map(toDomain);
  }

  async upsert(key: IntegrationConfigKey, value: string): Promise<IntegrationConfig> {
    const row = await getPrismaClient().integrationConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return toDomain(row);
  }
}

function toDomain(row: {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationConfig {
  return {
    id: row.id,
    key: row.key as IntegrationConfigKey,
    value: row.value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
