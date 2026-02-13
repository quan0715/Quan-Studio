# Backend Spec（MVP, Notion CMS）

## 1. 文件資訊
- 版本：v2.0
- 日期：2026-02-13
- 適用專案：Quan Studio（Next.js Route Handlers + Clean Architecture）

## 2. 後端目標
1. 提供 Notion webhook ingest 與同步任務處理。
2. 將 Notion 文章資料同步至 PostgreSQL。
3. 透過本地 API 提供前台查詢。
4. 提供 Resume Data Source 轉換 API（Section → Group → Item）。
5. 提供 Studio 登入驗證與 Notion 設定管理 API。

## 3. 架構規範
1. `domain`：Post 與 SyncJob 核心模型。
2. `application`：enqueue/process/retry/list use cases。
3. `infrastructure`：Notion client、Prisma repositories。
4. `interface`：Route handlers、DTO、validation、Studio auth guard。

## 4. Domain Model

### 4.1 Post
1. 欄位：
   - `id`
   - `title`
   - `slug`
   - `excerpt`
   - `tags`（string array）
   - `status` (`draft` | `published`)
   - `contentJson`（Notion blocks）
   - `coverUrl`
   - `publishedAt`
   - `notionPageId`
   - `notionLastEditedAt`
   - `syncedAt`
   - `syncError`
   - `createdAt` / `updatedAt`

### 4.2 NotionSyncJob
1. 欄位：
   - `id`
   - `pageId`
   - `status` (`pending` | `processing` | `succeeded` | `failed`)
   - `attempt`
   - `maxAttempts`
   - `payloadJson`
   - `errorMessage`
   - `dedupeKey`
   - `createdAt` / `updatedAt`

## 5. Use Case 規範
1. `EnqueueNotionSyncUseCase`
   - 驗證 payload，建立任務，去重。
2. `ProcessNotionSyncJobUseCase`
   - 拉取任務 -> 呼叫 Notion API -> upsert post -> 更新任務狀態。
3. `ListNotionSyncJobsUseCase`
   - 回傳任務列表（監控頁）。
4. `RetryNotionSyncJobUseCase`
   - 將 failed 任務改為 pending。
5. `ListPublicPostsUseCase` / `GetPublicPostBySlugUseCase`
   - 維持前台讀取能力。

## 6. API 規範

### 6.1 Integrations
1. `POST /api/integrations/notion/webhook/button`
   - 驗證 shared secret。
   - 入列同步任務。
   - 回 `202`。

### 6.2 Studio Sync
1. `GET /api/studio/sync-jobs`
   - 取得同步任務列表。
2. `POST /api/studio/sync-jobs`
   - 手動入列同步任務。
3. `POST /api/studio/sync-jobs/process-next`
   - 手動處理下一筆任務（供 worker/除錯）。
4. `POST /api/studio/sync-jobs/:id/retry`
   - 重試任務。

### 6.3 Studio Auth + Settings
1. `POST /api/studio/auth/login`
   - 驗證帳密，發放 Studio session cookie。
2. `POST /api/studio/auth/logout`
   - 清除 Studio session cookie。
3. `GET /api/studio/settings/notion`
   - 取得 blog/resume data source 設定（DB 優先，env fallback）。
4. `PATCH /api/studio/settings/notion`
   - 更新 blog/resume data source 設定至 DB。
5. `POST /api/studio/settings/notion/test`
   - 測試 Notion data source 連線。
   - 讀取 `NOTION_ENV_DATABASE_ID` 指向的 `NOTION.ENV` database，並以 `KEY/VALUE` 驗證 `ADMIN_USER_NAME`、`ADMIN_USER_PWD` 是否存在且有值（不回傳敏感值）。

### 6.4 Public
1. `GET /api/public/posts`
2. `GET /api/public/posts/:slug`
3. `GET /api/public/resume`

### 6.5 Health
1. `GET /api/health`

## 7. 錯誤碼（最小集合）
1. `VALIDATION_ERROR` -> 422
2. `UNAUTHORIZED_WEBHOOK` -> 401
3. `POST_NOT_FOUND` -> 404
4. `SYNC_JOB_NOT_FOUND` -> 404
5. `NOTION_API_ERROR` -> 502
6. `INTERNAL_ERROR` -> 500

## 8. 資料儲存規範
1. `posts.content_json` 僅存 Notion blocks。
2. `posts.cover_url` 來源為 Notion `page.cover`（不再讀取自訂 `Cover` property）。
3. Notion `page.icon` 需存於 `posts.content_json._notion.pageIcon` 供前端渲染。
4. 以 `notion_page_id` 作 upsert key。
5. 同步失敗需寫入 `sync_error` 與 job error。
6. `integration_configs` 儲存可變動的 integration 設定（例如 data source ids）。

## 9. 驗收標準（Backend DoD）
1. webhook 請求可成功入列任務。
2. worker 可成功同步 Notion page 到 DB。
3. 失敗任務可重試並可追蹤錯誤。
4. public API 可讀取同步後文章。
