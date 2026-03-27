# Draft Tool Specification

## Purpose
將工具建立時機從「使用者點部署」提前到「AI 產生程式碼」，確保整個開發過程都有 toolId。

## Requirements

### Requirement: Tool Status 欄位
Tool model SHALL 新增 `status` 欄位區分生命週期。

```prisma
enum ToolStatus {
  DRAFT
  PUBLISHED
}

model Tool {
  // ...existing fields...
  status ToolStatus @default(DRAFT)
}
```

#### Scenario: 既有工具 migration
- WHEN migration 執行
- THEN 所有既有工具的 status 設為 PUBLISHED

#### Scenario: Status 和 Visibility 獨立
- status 管生命週期：DRAFT → PUBLISHED
- visibility 管可見範圍：PRIVATE / GROUP / COMPANY / PUBLIC
- DRAFT 工具的 visibility 無意義（不會被任何人看到）

---

### Requirement: AI 產生 code 時自動建立草稿
系統 SHALL 在 AI 呼叫 updateCode 時，自動建立或更新 DRAFT 工具。

#### Scenario: 第一次產生 code
- WHEN AI 在對話中首次呼叫 updateCode
- AND 該對話尚無綁定工具
- THEN 系統建立一個 DRAFT 工具：
  - `name`: 空字串或預設名稱（如 "未命名工具"）
  - `code`: AI 產生的程式碼
  - `status`: DRAFT
  - `conversationId`: 當前對話 ID
  - `authorId`: 當前使用者
- AND 回傳 toolId 給前端

#### Scenario: 後續更新 code
- WHEN AI 再次呼叫 updateCode
- AND 該對話已有 DRAFT 工具
- THEN 系統更新該工具的 code 欄位
- AND toolId 不變

#### Scenario: 編輯已發布工具
- WHEN 使用者在 chat studio 編輯已發布的工具
- AND AI 呼叫 updateCode
- THEN 直接更新該工具的 code（不建新草稿）
- AND status 維持 PUBLISHED

---

### Requirement: ToolRunner 使用 toolId
ToolRunner SHALL 在開發階段就接收 toolId。

#### Scenario: 預覽草稿
- WHEN 使用者在 chat studio 預覽程式碼
- THEN ToolRunner 收到草稿的 toolId
- AND bridge 呼叫帶上 toolId（而非 dataSources 陣列）

#### Scenario: bridge 驗證
- WHEN 工具透過 bridge 存取資料來源
- AND 工具 status 為 DRAFT
- THEN bridge 改用 request body 的 dataSources 做驗證（維持現有 preview 行為）
- AND 同時傳入 toolId 供需要的 handler 使用

---

### Requirement: 發布流程
DeployDialog SHALL 從「建立」改為「發布」。

#### Scenario: 發布草稿
- WHEN 使用者點擊「發布」
- THEN 系統 PATCH 工具：
  - 更新 name、description、category、tags、visibility、allowedGroups
  - `status`: DRAFT → PUBLISHED
  - `dataSources`: 從對話設定同步
- AND 執行 code scan（維持現有流程）

#### Scenario: 更新已發布工具
- WHEN 使用者對已發布工具點擊「更新」
- THEN 系統 PATCH 工具（維持現有流程，status 不變）

---

### Requirement: DRAFT 工具不可見
DRAFT 工具 SHALL NOT 出現在公開介面。

#### Scenario: Marketplace
- WHEN 查詢 marketplace 工具列表
- THEN 排除 status = DRAFT

#### Scenario: 公開工具頁
- WHEN 存取 /public/tool/:id
- AND 該工具 status = DRAFT
- THEN 回傳 404

#### Scenario: 工具搜尋
- WHEN 搜尋工具
- THEN 排除 status = DRAFT

#### Scenario: 使用者自己的工具列表
- WHEN 作者查看自己的工具列表
- THEN DRAFT 工具可以顯示（或不顯示，由前端決定）

---

## API Changes

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | /api/tools/draft | 新增：建立草稿工具（name, code, conversationId） |
| PATCH | /api/tools/:id | 修改：支援 status 更新（DRAFT → PUBLISHED）|
| GET | /api/tools (marketplace) | 修改：加 `status: PUBLISHED` filter |
