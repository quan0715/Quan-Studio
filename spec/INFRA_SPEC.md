# Infra Spec（MVP, Notion CMS）

## 1. 文件資訊
- 版本：v2.0
- 日期：2026-02-13
- 適用專案：Quan Studio

## 2. 目標
1. 提供 Next.js + PostgreSQL + Sync Worker 的 dev/prod 基礎設施。
2. 支援 Notion webhook 進站與背景同步。

## 3. Dev 拓撲
1. `next`：提供 site/studio/api。
2. `postgres`：文章與同步任務資料庫。
3. `worker`（可先同容器啟動次進程或獨立服務）：處理 `notion_sync_jobs`。

## 4. 環境變數
1. `DATABASE_URL`
2. `NEXT_PUBLIC_SITE_URL`
3. `NOTION_API_TOKEN`
4. `NOTION_API_VERSION`
5. `NOTION_ENV_DATABASE_ID`（NOTION.ENV database id）
6. `NOTION_WEBHOOK_SHARED_SECRET`
7. `NOTION_SYNC_ACTIVE_POLL_INTERVAL_MS`
8. `NOTION_SYNC_IDLE_POLL_INTERVAL_MS`
9. `NOTION_SYNC_WORKER_CONCURRENCY`
10. `STUDIO_SESSION_SECRET`

補充：
- `NOTION_API_TOKEN` 目前仍以 env 為唯一來源。
- Data source IDs 僅以 DB `integration_configs` 管理。
- `NOTION_ENV_DATABASE_ID` 僅由 env 提供，並用於 `NOTION.ENV` 連線驗證。
- Studio 登入帳密由 `NOTION.ENV`（`ADMIN_USER_NAME` / `ADMIN_USER_PWD`）提供，不再由本地 env 設定。

## 5. Compose 規範
1. `docker-compose.dev.yml` 需包含 `next` + `worker` + `postgres`。
2. `next` healthcheck 以 `/api/health`。
3. `worker` 以輪詢方式呼叫 `POST /api/studio/sync-jobs/process-next`。
4. 支援 `HOST_PORT` 覆寫避免衝突。

## 6. 日誌與可觀測性
1. API log：`requestId/path/status/latency`。
2. sync job log：`jobId/pageId/status/attempt/error`。
3. webhook audit：`event source/pageId/requestId`。

## 7. 驗收標準（Infra DoD）
1. compose 可啟動 Next + Postgres。
2. webhook endpoint 可接收並入列任務。
3. worker 能成功處理任務。
4. 失敗任務可在 Studio 監控頁看到。
