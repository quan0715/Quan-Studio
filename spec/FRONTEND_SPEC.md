# Frontend Spec（MVP, Notion CMS）

## 1. 文件資訊
- 版本：v2.0
- 日期：2026-02-13
- 適用專案：Quan Studio（Next.js App Router）

## 2. 前端目標
1. Public 前台顯示已同步且已發布文章。
2. Studio 提供同步監控，不提供本地文章編輯。
3. 前端只消費本地 API，不直接連 Notion API。
4. `/resume` 與 `/resume-pdf` 直接讀取 Notion Resume Data Source（經由本地 API）。
5. `/studio` 需帳號密碼登入後可使用。

## 3. 前端架構規範

### 3.1 技術棧
1. UI 基礎採用 `shadcn/ui`。
2. 目錄維持：
   - `src/app/(site)`
   - `src/app/(studio)`
   - `src/presentation/components`
   - `src/presentation/features`
   - `src/presentation/lib`
   - `src/presentation/types`

### 3.2 分層規範
1. `src/app/*` 只做頁面組裝。
2. feature 層透過 `serverApiRequest`/`apiRequest` 呼叫 API。
3. 監控頁不可直接操作資料庫或 Notion SDK。

## 4. 路由與 Use Case（目前目標）
1. `GET /`
   - 顯示站點入口與導引。
2. `GET /blog`
   - 顯示已發布文章列表。
3. `GET /blog/[slug]`
   - 顯示單篇文章內容。
4. `GET /resume`
   - 顯示從 Notion Resume Data Source 轉換後的履歷階層。
5. `GET /resume-pdf`
   - 顯示可列印版本，資料來源同 `/resume`。
6. `GET /studio`
   - 導向 `/studio/posts`。
7. `GET /studio/posts`
   - 顯示同步任務列表與狀態。
8. `GET /studio/settings/notion`
   - 檢視與更新 blog/resume data source 設定，並執行連線測試。
9. `POST /api/studio/sync-jobs/:id/retry`（透過前端觸發 API）
   - 重試失敗任務。

## 5. UI 功能規範

### 5.1 Public
1. 文章列表需顯示 title、excerpt、updatedAt。
2. 文章列表與詳頁需顯示 tags（來自 Notion `Tag`/`Tags`）。
3. 詳頁需顯示封面（若有）與內容。
4. 封面來源為 Notion `Page Cover`，不使用自訂 `Cover` property。
5. 標題需渲染 Notion `Page Icon`（emoji 或 icon URL）。
6. slug 不存在顯示 404。
7. Resume 頁面期間文字由 Resume `Date` 欄位渲染（`start - end`，無 `end` 顯示 `Present`）。
8. Resume 前端僅依賴新 schema，不處理舊欄位相容。

### 5.2 Studio（Sync Monitor）
1. 任務欄位至少顯示：`status`、`pageId`、`attempt`、`updatedAt`、`errorMessage`。
2. `failed` 任務需提供 Retry。
3. 提供最後同步時間與狀態摘要。

### 5.3 Studio（Auth + Settings）
1. `Studio` 頁面需先登入（username/password）。
2. 提供登入與登出流程。
3. Notion 設定頁需顯示 data source id 來源（database/environment/missing）。
4. Notion 設定頁需提供 `Save` 與 `Test Connection`。
5. `Test Connection` 需額外顯示 `NOTION.ENV` 驗證結果（可讀取、且 `ADMIN_USER_NAME`/`ADMIN_USER_PWD` 具備有效值）。

### 5.4 編輯器規範（變更）
1. 本地 Notion-like/Tiptap 編輯器自 MVP 退場。
2. 文章編輯入口改由 Notion 負責。
3. 本地只保留內容渲染能力（讀同步後資料）。

## 6. API 契約規範（前端關注）
1. 成功：`{ ok: true, data: T }`
2. 失敗：`{ ok: false, error: { code, message } }`
3. `PostDetailDto.contentJson` 為 Notion blocks JSON。

## 7. Rendering 規範
1. `/blog` 與 `/blog/[slug]` 使用 server rendering。
2. Notion blocks 渲染優先支援：paragraph/heading/list/quote/code/image/divider。
3. 暫不支援之 block 要有 graceful fallback（不崩潰）。

## 8. 驗收標準（Frontend DoD）
1. Public 可正確顯示同步後文章。
2. Studio 可查看同步任務並重試失敗任務。
3. 不再出現本地文章編輯流程。
