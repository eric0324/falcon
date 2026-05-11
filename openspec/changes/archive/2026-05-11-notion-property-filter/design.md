# Design: AI propertyFilter → Notion API filter JSON

## AI tool 介面

```ts
notionSearch({
  action: "query",
  databaseId: string,
  search?: string,                 // 既有，title contains
  propertyFilter?: PropertyFilter, // 本次新增
  limit?: number,
})

type PropertyFilter = {
  property: string;                 // 必填
  // 以下恰好填一個（Zod 強制）
  equals?: string | number | boolean;
  contains?: string;
  is_empty?: true;
  is_not_empty?: true;
  greater_than?: number;
  less_than?: number;
  between?: { from: number | string; to: number | string };
  before?: string;        // ISO date
  after?: string;
  on_or_before?: string;
  on_or_after?: string;
  past_week?: true;
  past_month?: true;
  past_year?: true;
  next_week?: true;
  next_month?: true;
  next_year?: true;
}
```

## 翻譯流程

```
AI 傳 propertyFilter
       ↓
getDatabase(databaseId)  ← 取 properties schema 拿到 propName → type 對應
       ↓
查表 TRANSLATORS[propType](propName, operator, value)
       ↓
回傳 Notion filter JSON（單一條件）
       ↓
若同時有 search → 包成 { and: [titleFilter, propFilter] }
       ↓
送 queryDatabaseAll(databaseId, { filter })
```

## Type × Operator 矩陣

`?` 表示該型別可用此 operator；空白表示不可用、會回錯。

| Type | equals | contains | is_empty/not_empty | gt/lt/between | before/after/on_or_X | past_X/next_X |
|------|:------:|:--------:|:-----:|:-----:|:-----:|:-----:|
| title / rich_text / url / email / phone_number | ? | ? | ? | | | |
| number | ? | | ? | ? | | |
| checkbox | ? | | | | | |
| select | ? | | ? | | | |
| multi_select | | ? | ? | | | |
| status | ? | | ? | | | |
| date / created_time / last_edited_time | ? | | ? | ?（between） | ? | ? |
| people | | ? | ? | | | |
| files | | | ? | | | |
| relation | | ? | ? | | | |
| formula | — 第一版不支援，回錯 |
| rollup | — 第一版不支援，回錯 |

## 翻譯範例

### Status equals Done

```ts
input:  { property: "Status", equals: "Done" }
schema: Status → type "status"
output: { property: "Status", status: { equals: "Done" } }
```

### Tags contains "p1"

```ts
input:  { property: "Tags", contains: "p1" }
schema: Tags → type "multi_select"
output: { property: "Tags", multi_select: { contains: "p1" } }
```

### Estimate between 3..8

```ts
input:  { property: "Estimate", between: { from: 3, to: 8 } }
schema: Estimate → type "number"
output: {
  and: [
    { property: "Estimate", number: { greater_than_or_equal_to: 3 } },
    { property: "Estimate", number: { less_than_or_equal_to: 8 } }
  ]
}
```

### Due past_week

```ts
input:  { property: "Due", past_week: true }
schema: Due → type "date"
output: { property: "Due", date: { past_week: {} } }
```

### search + propertyFilter 同用

```ts
input:  search="設計", propertyFilter={ property: "Status", equals: "Done" }
output: {
  and: [
    { property: "Name", title: { contains: "設計" } },
    { property: "Status", status: { equals: "Done" } }
  ]
}
```

> 注意：title filter 的 `property` 用該 database 實際 title 欄位名（從 schema 取），不再硬寫 `"Name"`。

## 錯誤訊息形狀

```ts
{
  success: false,
  service: "notion",
  error: "Property 'Assignne' not found in database 'Tasks'. Available properties: Name (title), Status (status), Assignee (people), Due (date), ...",
  availableProperties: [
    { name: "Name", type: "title" },
    { name: "Status", type: "status" },
    ...
  ]
}
```

operator 不相容：

```ts
{
  success: false,
  service: "notion",
  error: "Operator 'greater_than' is not supported for property 'Status' (type: status). Supported operators: equals, is_empty, is_not_empty.",
}
```

## 程式碼結構

```
src/lib/integrations/notion/property-filter.ts
├── type PropertyFilter           ← Zod schema 同源
├── type DatabaseSchema           ← 從 getDatabase().properties 抽出 propName → propType
├── extractDatabaseSchema(db)
├── translatePropertyFilter(filter, schema)
│   ├── 找 property → 不在 schema 回錯 + 列 available
│   ├── 抓 operator key
│   ├── dispatch TRANSLATORS[propType](propName, operator, value)
│   │   └── 若該 operator 對該 type 不合法，回錯
│   └── 回傳 Notion filter JSON
└── const TRANSLATORS: Record<PropertyType, Translator>
    ├── translateTitle, translateRichText, translateUrl, ...（共用文字 translator）
    ├── translateNumber
    ├── translateCheckbox
    ├── translateSelect / translateMultiSelect / translateStatus
    ├── translateDate（含 past/next 等）
    ├── translatePeople / translateFiles / translateRelation
    └── 未列入 → 拋 "type not supported"
```

`translatePropertyFilter` 回傳形如 `{ filter: NotionFilter }` 或 `{ error: string, availableProperties? }`。

## Schema fetch 與快取

每次 `query` 帶 `propertyFilter` 都需要 `getDatabase` 拿 schema。簡單做：每次 chat request 都重新打——AI 多輪對話的 cache hit 機率不高，先不過度設計。如果之後測出延遲明顯，再加 per-request Map cache。

## 不做的事

- 不嘗試自動修正大小寫（Notion 是大小寫敏感的；模糊比對風險高）
- 不接受巢狀 `and`/`or`（一次最多 search + propertyFilter 兩條件）
- 不支援 formula/rollup filter（Notion 上要再指定內層 type bucket，介面變蕪雜，等真實需求出現再做）
- 不暴露 `does_not_equal` / `does_not_contain` / `starts_with` / `ends_with`（先做最常用的；可隨時補）
