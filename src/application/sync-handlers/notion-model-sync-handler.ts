export interface NotionModelSyncHandler {
  readonly modelId: string;
  syncPage(pageId: string): Promise<{ entityId: string }>;
}
