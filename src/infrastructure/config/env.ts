export const env = {
  notionApiToken: process.env.NOTION_API_TOKEN ?? "",
  notionApiVersion: process.env.NOTION_API_VERSION ?? "2025-09-03",
  notionEnvDatabaseId: process.env.NOTION_ENV_DATABASE_ID ?? process.env.NOTION_ENV_PAGE_ID ?? "",
  notionSourcePageId: process.env.NOTION_SOURCE_PAGE_ID ?? "",
  notionWebhookSharedSecret: process.env.NOTION_WEBHOOK_SHARED_SECRET ?? "",
  notionSyncWorkerConcurrency: Number(process.env.NOTION_SYNC_WORKER_CONCURRENCY ?? 1),
};
