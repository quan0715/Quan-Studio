# 內容格式說明（Notion Blocks）

## 1. 文件資訊
- 版本：v2.0
- 日期：2026-02-13
- 適用範圍：Notion 同步後內容渲染

## 2. 格式原則
1. 系統僅支援 Notion blocks 作為文章內容來源。
2. 本地不再接受 tiptap/editor JSON 寫入。
3. `contentJson` 欄位保存 Notion API 回傳的 block 結構（可含巢狀 children）。

## 3. MVP 渲染支援
1. paragraph
2. heading_1 / heading_2 / heading_3
3. bulleted_list_item
4. numbered_list_item
5. quote
6. code
7. image
8. divider

## 4. fallback 規範
1. 未支援 block type 不可讓頁面崩潰。
2. 未支援 block 以簡化文字或 placeholder 呈現。

## 5. 編輯入口
1. 文章編輯由 Notion 完成。
2. Quan Studio 只負責同步與顯示，不提供本地 block 編輯器。
