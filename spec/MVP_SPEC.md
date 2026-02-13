# Quan Studio MVP 規格（Spec）

## 1. 文件資訊
- 版本：v2.0
- 日期：2026-02-13
- 適用範圍：Next.js 全端重寫 MVP（Notion CMS Edition）

## 2. 背景與目標
本專案以 Notion 作為唯一內容後台（CMS），由 Notion webhook 觸發同步到本地資料庫，前台透過本地 API 顯示內容：

1. 使用 Notion 管理文章內容與狀態。
2. webhook 觸發文章同步，資料寫入 PostgreSQL。
3. 前台維持高效讀取（讀 DB，不直連 Notion API）。

## 3. 範圍

### 3.1 In Scope（MVP 內）
1. Notion Data Source 作為文章來源。
2. Notion 按鈕 webhook 觸發同步（enqueue job）。
3. 背景同步工作（worker/process job）。
4. 文章資料 upsert 到本地 `posts` 表。
5. 前台文章列表與詳頁顯示（讀本地 API）。
6. Studio 改為同步監控台（job 狀態、錯誤、重試）。
7. Docker dev/prod、Compose、CI/CD 基礎流程。

### 3.2 Out of Scope（MVP 外）
1. 雙向同步（本地反寫 Notion）。
2. Notion 與本地編輯衝突解決策略（因本地編輯退場）。
3. 高階排程系統（先用簡易 worker loop）。

## 4. 核心流程
1. 使用者在 Notion 點 webhook 按鈕。
2. `POST /api/integrations/notion/webhook/button` 驗證請求並入列同步任務。
3. worker 拉取任務，呼叫 Notion API 取得 page + blocks。
4. 轉換/映射後 upsert `posts`。
5. 前台透過 `/api/public/posts*` 顯示最新內容。

## 5. 功能需求（Functional Requirements）

### FR-01 Notion 同步入口
1. 系統需提供 webhook endpoint。
2. endpoint 需驗證 shared secret。
3. endpoint 預設回應 `202`，不可阻塞等待完整同步。

### FR-02 同步任務管理
1. 系統需建立同步任務資料表。
2. 任務需記錄狀態（pending/processing/succeeded/failed）。
3. 失敗任務需保留錯誤原因並可重試。

### FR-03 文章資料同步
1. 需以 `notion_page_id` 作為 upsert key。
2. 文章需保存 Notion 原始 blocks JSON（不使用 tiptap 格式）。
3. 狀態（draft/published）需映射到本地 `posts.status`。

### FR-04 前台讀取
1. 前台列表 API 僅回傳 `published`。
2. 文章詳頁 API 以 slug 查詢。
3. 前台不直接呼叫 Notion API。

### FR-05 Studio 監控
1. Studio 顯示同步任務列表與狀態。
2. 支援手動重試失敗任務。
3. 本地文章編輯功能移除。

## 6. 非功能需求（NFR）
1. 同步處理需具備重試與可觀測性（request id/job id/error）。
2. webhook endpoint 需具備基本安全防護（secret 驗證）。
3. API 回應格式需維持 `ApiSuccess/ApiError` 一致性。

## 7. 系統設計（概要）
1. `src/app/api/integrations/notion/*`：webhook 與同步觸發 API。
2. `src/application/use-cases/*notion-sync*`：同步任務與流程 orchestration。
3. `src/infrastructure/notion`：Notion API client。
4. `src/infrastructure/repositories/*notion-sync-job*`：任務儲存。
5. `src/presentation/features/sync-*`：Studio 監控 UI。

## 8. 資料模型（概要）
1. `posts` 新增欄位：
   - `notion_page_id` (unique)
   - `notion_last_edited_at`
   - `synced_at`
   - `sync_error`
2. 新增 `notion_sync_jobs`：
   - `id`, `page_id`, `status`, `attempt`, `error_message`, `payload_json`, `dedupe_key`。

## 9. 驗收標準（DoD）
1. Notion webhook 進站可建立同步任務。
2. worker 可將 Notion page upsert 到本地 DB。
3. 前台 `/blog` 與 `/blog/[slug]` 可顯示同步後內容。
4. Studio 可查看同步狀態與手動重試失敗任務。
