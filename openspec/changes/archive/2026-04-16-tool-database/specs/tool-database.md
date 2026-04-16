# Tool Database Specification

## Purpose
讓工具擁有持久化的資料表，可透過 Bridge API 進行 CRUD 操作。

## Requirements

### Requirement: 資料模型

```prisma
model ToolTable {
  id      String @id @default(cuid())
  tool    Tool   @relation(fields: [toolId], references: [id], onDelete: Cascade)
  toolId  String
  name    String
  columns Json   // [{ name, type, options? }]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  rows      ToolRow[]

  @@unique([toolId, name])
}

model ToolRow {
  id        String    @id @default(cuid())
  table     ToolTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  tableId   String
  data      Json      // { "欄位名": value, ... }
  createdBy String?   // userId

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tableId, createdAt])
}
```

#### Column 定義格式

```typescript
interface ColumnDef {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  options?: string[];  // type=select 時的選項
}
```

---

### Requirement: Bridge CRUD

tooldb 是 platform capability，bridge route 跳過 dataSources 檢查，handler 驗證 tableId 屬於 toolId。

#### Schema Actions

| Action | 參數 | 說明 |
|--------|------|------|
| `createTable` | `{ name, columns }` | 建表（已存在則回傳現有） |
| `updateSchema` | `{ tableId, columns }` | 更新欄位定義 |
| `deleteTable` | `{ tableId }` | 刪表（cascade rows） |
| `listTables` | — | 列出工具所有表 + rowCount |

#### Data Actions

| Action | 參數 | 說明 |
|--------|------|------|
| `insert` | `{ tableId, data }` | 新增一筆（10K 上限、10KB 檢查） |
| `list` | `{ tableId, filter?, sort?, limit?, offset? }` | 查詢 + normalize + filter + sort + 分頁 |
| `get` | `{ tableId, rowId }` | 取得單筆 + normalize |
| `update` | `{ tableId, rowId, data }` | 淺合併更新 |
| `delete` | `{ tableId, rowId }` | 刪除一筆 |

#### Scenario: Schema-on-Read

- WHEN 查詢資料
- THEN 根據 ToolTable.columns 做 projection：
  - 目前有的欄位：回傳值（或 null）
  - 已刪除的欄位：不回傳（raw data 保留）

#### Scenario: 資料量上限
- WHEN 資料表已有 10,000 筆
- AND 嘗試 insert
- THEN 拒絕並回傳錯誤

#### Scenario: 跨工具存取
- WHEN 工具 A 嘗試存取工具 B 的 tableId
- THEN 拒絕

---

### Requirement: 工具內 SDK

在 ToolRunner iframe 注入 `window.tooldb`，透過 postMessage → bridge 呼叫。

```typescript
window.tooldb = {
  createTable:  (name, columns) => Promise<{ table: TableInfo }>,
  updateSchema: (tableId, columns) => Promise<{ table: TableInfo }>,
  deleteTable:  (tableId) => Promise<{ success: boolean }>,
  listTables:   () => Promise<{ tables: TableInfo[] }>,
  insert:       (tableId, data) => Promise<{ row: Row }>,
  list:         (tableId, options?) => Promise<{ rows: Row[], total: number }>,
  get:          (tableId, rowId) => Promise<{ row: Row }>,
  update:       (tableId, rowId, data) => Promise<{ row: Row }>,
  delete:       (tableId, rowId) => Promise<{ success: boolean }>,
};
```

---

### Requirement: AI 整合

System prompt 加入 tooldb 使用說明（英文），讓 AI 生成工具時知道如何使用。工具初始化時用 `createTable` 確保表存在（冪等）。

---

### Requirement: 管理頁面（唯讀）

工具詳情頁新增資料表區塊，僅作者可見。

#### 顯示內容
- 資料表列表：名稱 + 筆數
- Schema 檢視：欄位名稱、型別、select 選項
- 資料預覽：表格顯示 normalized 資料，分頁（每頁 20 筆）
- 不可編輯、不可刪除

#### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tools/:id/tables | 列出工具的資料表 |
| GET | /api/tools/:id/tables/:tableId/rows | 分頁取得資料 |
| POST | /api/bridge | tooldb 所有操作 |
