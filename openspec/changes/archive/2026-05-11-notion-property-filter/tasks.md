# Tasks: propertyFilter for Notion query

## Task 1: Database schema 抽取

- [x] `client.ts` 的 `NotionDatabase` 型別補 `properties: Record<string, { id: string; name: string; type: string }>` 欄位
- [x] `property-filter.ts` 新增 `extractDatabaseSchema(db: NotionDatabase): DatabaseSchema`
  - 回傳 `{ propsByName: Map<string, { type: string; titleProp: boolean }>, titlePropertyName: string }`
- [x] 單元測試

## Task 2: Operator 翻譯

- [x] 在 `property-filter.ts` 建立 `TRANSLATORS` dispatch table
- [x] 每種型別一個翻譯函式，列出該 type 合法的 operator set
- [x] 不合法的 operator → 回 `{ error: string }`，含「該 type 支援的 operator 列表」
- [x] `between` 在 number 與 date 上都展開為 AND 結構
- [x] 單元測試逐 type × 主要 operator 至少各一例

## Task 3: 主翻譯函式

- [x] `translatePropertyFilter(filter, schema): { filter: NotionFilter } | { error, availableProperties }`
- [x] property name 不存在 → 友善錯誤 + `availableProperties`
- [x] 多個 operator key 同時出現 → Zod 層擋掉（在 tool 端）
- [x] 單元測試覆蓋錯誤路徑

## Task 4: 串到 AI tool

- [x] `notion-tools.ts` 的 `inputSchema` 加 `propertyFilter` 物件 + Zod `.refine()` 限制「恰好一個 operator key」
- [x] `query` action 收到 `propertyFilter`：
  - [x] 呼叫 `getDatabase` 取 schema
  - [x] 翻譯失敗 → 回錯誤訊息
  - [x] 翻譯成功 → 若同時有 `search`，組成 `and: [titleFilter, propFilter]`（title filter 用 schema 取出的實際 title 欄位名）
  - [x] 送 `queryDatabaseAll(databaseId, { filter }, limit)`
- [x] 更新 tool description 引導 AI 在「找人名／tag／status／日期條件」時優先用 `propertyFilter`

## Task 5: AI tool 測試

- [x] `notion-tools.test.ts` 新增
  - [x] propertyFilter equals 命中
  - [x] propertyFilter contains（多種 type：multi_select、people、rich_text）
  - [x] search + propertyFilter 同用 → 組合 AND
  - [x] property name 不存在 → 回錯誤含 availableProperties
  - [x] operator 不相容 → 回錯誤
  - [x] between 在 number 上展開正確
  - [x] past_week 在 date 上輸出正確 Notion JSON

## Task 6: 收尾

- [x] `npx tsc --noEmit` 與 `npm test` 全綠
- [x] 手動測試：對原本壞掉的「找吳冠賢」場景重試，AI 改用 propertyFilter 後能命中
- [x] `openspec archive notion-property-filter --yes`

## 依賴關係

```
Task 1 ← Task 2 ← Task 3 ← Task 4 ← Task 5 ← Task 6
```

Task 2、3 可重疊（先空殼 dispatch table 再逐 type 補）。
