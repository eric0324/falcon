# Tasks: AI 聊天工具讀取 Notion database properties

## Task 1: Property extractor helper

- [x] 建立 `src/lib/integrations/notion/properties.ts`
- [x] 定義 `ExtractedPropertyValue` 型別：`string | number | boolean | string[] | { start: string; end?: string } | null`
- [x] 實作 `extractProperties(rawProps: Record<string, unknown>): Record<string, ExtractedPropertyValue>`
- [x] 每種型別各自一個小型 extractor function（`extractTitle`、`extractSelect`、`extractRelation` …）
- [x] 空值與未知型別跳過、不寫入結果
- [x] Formula / Rollup：讀 `formula.<type>` / `rollup.<type>` 取得 underlying value，巢狀僅展開一層

## Task 2: 單元測試

- [x] 建立 `src/lib/integrations/notion/properties.test.ts`
- [x] 為每種支援的 type 至少一個有值 + 一個空值的 case
- [x] Formula：number / string / boolean / date 四種 underlying 各一例
- [x] Rollup：array / number 各一例
- [x] Relation：多個 page id 的陣列
- [x] 未知 type（例如自編造 `xxx_unknown`）→ 確認不在結果中、不丟錯
- [x] 整批屬性混在一起的 fixture 測試（模擬真實一頁 Notion task）

## Task 3: 串到 AI tool

- [x] `src/lib/integrations/notion/index.ts` export `extractProperties` 與 `ExtractedPropertyValue`
- [x] `src/lib/ai/notion-tools.ts`：
  - [x] `read` action：在 `pageData` 加 `properties: extractProperties(page.properties)`
  - [x] `query` action 帶 search 的分支：每筆 result 加 `properties`
  - [x] `query` action 不帶 search 的分支：每筆 result 加 `properties`
  - [x] `searchAll` 與 `list`：保持原樣，不加
- [x] 更新 tool description，告訴 AI properties 會出現在 read / query 的回傳中

## Task 4: AI tool 測試

- [x] `src/lib/ai/notion-tools.test.ts` 新增測試
- [x] mock 一筆含多種屬性的 page → 呼叫 `read` → 驗證 `properties` 有被夾帶且正確
- [x] mock 含多筆 page 的 query → 驗證每筆都帶 `properties`
- [x] mock `searchAll` 結果 → 驗證 **沒有** `properties`（避免 regression）

## Task 5: 收尾

- [x] 跑全部測試確認綠燈
- [x] 手動測試：對真實 Notion task 資料庫問「這份任務的 Status 是什麼」「列出所有未完成項目」確認 AI 看得到屬性
- [x] `/opsx:archive` 或 `openspec archive expose-notion-properties --yes`

## 依賴關係

```
Task 1 ← Task 2 ← Task 3 ← Task 4 ← Task 5
```

- Task 1、2 一起做（TDD：先寫測試再寫實作；或實作完馬上補測試）
- Task 3 等 helper 穩定後再串
- Task 4 隨 Task 3 完成
- Task 5 全部綠燈後做
