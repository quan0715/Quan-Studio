import type { IntegrationConfig, IntegrationConfigKey } from "@/domain/integration-config/integration-config";

export interface IntegrationConfigRepository {
  findByKey(key: IntegrationConfigKey): Promise<IntegrationConfig | null>;
  findByKeys(keys: IntegrationConfigKey[]): Promise<IntegrationConfig[]>;
  upsert(key: IntegrationConfigKey, value: string): Promise<IntegrationConfig>;
}
