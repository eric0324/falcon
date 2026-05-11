# Proposal: AI 聊天工具讀取 Notion database properties

## 概述

讓聊天時的 Notion AI 工具能讀到 Notion 頁面的 properties（Status、Tags、Date、Number、Select、Relation、Formula、Rollup 等），而不只是頁面標題與正文 blocks。

## 動機

- `src/lib/ai/notion-tools.ts:28` 的 `extractPageTitle()` 只挑 `type === "title"` 的欄位，其他屬性全部丟掉
- 結果：使用者問「這份任務的 Status 是什麼」「Due Date 是哪天」「這個 Project 有哪些 Tags」，AI 看不到，只能回答正文中提到的文字
- Notion database 的真實價值在 properties，目前 AI 等於只用了 30% 的資料
- `src/app/api/knowledge-bases/[id]/import-notion/route.ts:113-148` 已有針對 properties 的部分支援，但只在 blocks 為空時 fallback，且只支援 8 種型別、邏輯內聯在 route 裡——本案不動這部分，留待未來再統一

## 目標

1. 在 `src/lib/integrations/notion/` 新增 `properties.ts`，提供 `extractProperties(rawProps)` 將 Notion API 原始 properties 解析成扁平、好讀的 `Record<string, ExtractedPropertyValue>`
2. `notionSearch` 工具的 `read` 與 `query` action 預設在回傳資料中夾帶解析後的 properties
3. 支援以下型別（涵蓋常見 Notion database 欄位）：
   - 基本：`title`、`rich_text`、`number`、`checkbox`、`url`、`email`、`phone_number`
   - 選項：`select`、`multi_select`、`status`
   - 時間：`date`、`created_time`、`last_edited_time`
   - 人物：`people`、`created_by`、`last_edited_by`
   - 檔案：`files`
   - 進階：`relation`（僅回 page id 陣列）、`formula`（解開 underlying value）、`rollup`（解開 underlying value）
   - 識別：`unique_id`
4. 未知或不支援的型別：跳過，不寫入結果（不丟錯，靜默忽略）
5. 空值（如 select 沒選、date 沒填）：跳過該欄，不寫入 `null` 佔位，省 token

## 非目標

- 不做 property filter 翻譯（AI 傳 `Status=Done` → 自動轉 Notion filter JSON），先讓 AI 拿到 properties 後自己在頭腦裡過濾
- 不重構 `import-notion` route 的 fallback 邏輯（雖然能共用 helper，本案不動，避免影響知識庫匯入）
- 不解析 relation 的 page 標題（會多 N 次 API 呼叫，成本高）；AI 想知道標題可再呼叫 `read(pageId)`
- 不擴張 `searchAll` action——它是跨資料庫搜尋大網，回傳量大，properties 留在 `query` / `read` 才出現

## 影響範圍

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/notion/properties.ts` | `extractProperties()` 與型別定義 |
| `src/lib/integrations/notion/properties.test.ts` | 單元測試，覆蓋所有支援型別 |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/notion/index.ts` | export 新 helper 與型別 |
| `src/lib/ai/notion-tools.ts` | `read` / `query`（含 `query + search`、`query` 不帶 search）回傳資料加 `properties` 欄位 |
| `src/lib/ai/notion-tools.test.ts` | 新增測試案例驗證 properties 有被夾帶 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| query 多筆時 properties 把 token 用爆 | 空值跳過、relation 只回 id；AI prompt 已引導用 `limit` 控制 row 數 |
| 未知 property type 在未來 Notion API 出現 | 預設靜默忽略而非拋錯，向前相容 |
| extractor 寫法易出錯（每種 type schema 不同） | 每種型別獨立小函式 + 單元測試逐一覆蓋；遇到結構不符就跳過 |
| Formula/Rollup 巢狀（formula 內包 rollup） | 只解一層 underlying value；二層巢狀返回 raw 字串表示，不嘗試遞迴展開 |

## 驗收標準

1. 對含多種屬性（Status / Tags / Due Date / Owner / Done?）的 Notion task 頁面呼叫 `read`，回傳的 `properties` 物件正確列出每個欄位
2. 對該 task 所屬資料庫呼叫 `query`，每筆結果都帶 `properties`
3. 含 Relation 欄位的頁面，`properties.<relation欄名>` 是 page id 陣列（非空），AI 可後續用 `read(pageId)` 跟進
4. 含 Formula（公式輸出文字或數字）的頁面，`properties.<欄名>` 是解開後的純值（string / number / boolean / date string）
5. 空 select、空 date 不出現在 `properties` 物件中
6. `searchAll` 與 `list` action 回傳結構不變（無 `properties` 欄位）
7. 新增的單元測試全綠
