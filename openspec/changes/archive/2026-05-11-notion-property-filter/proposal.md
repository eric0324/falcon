# Proposal: AI 工具用 propertyFilter 在 Notion server-side 篩選

## 概述

讓 `notionSearch` 的 `query` action 接受 `propertyFilter` 參數，AI 可指定「在哪個 property、用哪個 operator、找什麼值」，後端翻譯成 Notion API 原生 filter JSON 後送到 Notion 端篩選。彌補 `search` 只能比對標題、`query` 預設只抓 20 筆的兩個盲點。

## 動機

上一輪 `expose-notion-properties` 上線後實測：使用者問「在某資料庫上找吳冠賢」，AI 直接回「沒資料」。原因：

- `search` 走 `buildTitleContainsFilter()`，只篩 title，名字在 `people`/`select`/`rich_text` 等欄位則漏抓
- 改成不帶 `search` 的 `query`？預設 `limit=20`，超過 20 筆就漏
- 把 limit 拉高？每筆現在還帶 properties，token 成本線性放大，治標不治本
- 真正該做的是 server-side filter — Notion API 本來就支援，過去只是沒接出來

## 目標

1. `notionSearch({ action: "query", databaseId, propertyFilter })` 接受結構化過濾條件
2. 支援的 operator
   - 基本：`equals` / `contains` / `is_empty` / `is_not_empty`
   - 數值：`greater_than` / `less_than` / `between`（內部展開為 `>=` AND `<=`）
   - 日期：`before` / `after` / `on_or_before` / `on_or_after` / `past_week` / `past_month` / `past_year` / `next_week` / `next_month` / `next_year` / `between`
3. 後端依據 property 實際 type 翻譯成 Notion filter JSON（status 用 `status` bucket、multi_select 用 `multi_select`、date 用 `date` 等）
4. `search` 與 `propertyFilter` 可同時使用，內部組成 `and: [...]`
5. AI 傳錯 property name 或 operator 與 type 不相容時，回友善錯誤並列出可用 properties 與型別
6. 不擴張 AI tool 介面為「不限嵌套的 and/or」— 一次只接 1 個 `propertyFilter`，搭配 `search` 形成最多 2 條 AND；複雜邏輯留給 AI 自己拆多次呼叫

## 非目標

- 不支援使用者自訂巢狀 `and`/`or` — 介面複雜、AI 易誤用，先不做
- 不在這次重構 `searchAll`／`list`／`read` — 它們不需要 server-side filter
- 不做 sort（依某 property 排序）— 另案
- 不做 cursor 分頁回流給 AI — 仍用 `queryDatabaseAll` 後端自動翻頁

## 影響範圍

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/notion/property-filter.ts` | `translatePropertyFilter()` 翻譯 + property schema 驗證 |
| `src/lib/integrations/notion/property-filter.test.ts` | 單元測試，逐 type × 逐 operator |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/notion/client.ts` | `NotionDatabase` 型別補上 `properties` schema 欄位 — 目前介面沒有 |
| `src/lib/integrations/notion/index.ts` | export 新 helper |
| `src/lib/ai/notion-tools.ts` | `notionSearch` 的 `inputSchema` 加 `propertyFilter`；query action 接 `propertyFilter`、組合 search + propertyFilter 後送 Notion |
| `src/lib/ai/notion-tools.test.ts` | 新增測試案例 |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| Property name 大小寫敏感 | Notion API 嚴格大小寫；驗證失敗的錯誤訊息一律列出實際 name，AI 看到後可重試 |
| 翻譯漏掉某種 property type | 未支援的 type → 回明確錯誤「property X type Y 暫不支援 filter」，不靜默失敗 |
| getDatabase 多一次 API 呼叫 | 每次 `query` 帶 `propertyFilter` 多一次 fetch；用簡單 in-flight cache key by databaseId 避免同一次請求內重複 fetch |
| Notion filter JSON 在不同 type 結構差異大 | 用 dispatch table 設計：`TRANSLATORS[propType](propName, operator, value)`，新增 type 只動一處 |
| AI 同時誤傳多個 operator key | Zod schema `.refine()` 限制恰好一個 operator key，否則回 400 |

## 驗收標準

1. AI 對該人員 db 呼叫 `query({ propertyFilter: { property: "Assignee", contains: "吳冠賢" } })` 能拿到該成員負責的所有頁面
2. `Status` 欄位用 `equals` 篩出「Done」狀態，AI 看到結果與 Notion UI 一致
3. 同時帶 `search` 與 `propertyFilter` → 內部組合成 `and: [...]`，雙條件命中
4. property name 拼錯 → 回 `{ success: false, error: "Property 'Assignne' not found. Available: ...", availableProperties: [...] }`
5. operator 與 type 不相容（例如對 `status` 用 `greater_than`）→ 回明確錯誤訊息
6. `between: { from, to }` 在數值與日期 type 上都正確展開為 AND 形式
7. 未支援的 type（如 `formula`、`rollup`，Notion API filter 上有更繁複的內層結構，第一版可暫不支援）→ 回明確錯誤
8. 新增的單元測試全綠
