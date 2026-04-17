# Proposal: improve-code-editing-safety

## Summary

讓工具程式碼的編輯更安全，降低 AI 在對話中誤覆蓋既有工具的機率。三層防禦：
1. 強化 system prompt，明確要求 AI 局部修改時逐字保留未被提到的部分
2. 新增 `ToolCodeSnapshot` 表，`updateCode` / `editCode` 成功前自動快照舊 code，工具詳情頁提供「版本歷史」下拉一鍵還原
3. 新增 `editCode` AI tool 支援「exact string find → replace」局部替換；AI 依使用者語意判斷：局部改用 `editCode`，整體重寫才用 `updateCode`

## Motivation

目前 `updateCode` tool 接收「完整新 code」並直接覆蓋 `Tool.code`。使用者只要求調整一個按鈕，AI 有時會重新生成整份 code，把其他既有功能一併砍掉。已有使用者回報工具被蓋掉、無法還原，體驗傷害大。

三層防禦讓：
- 大多數小修改能走 `editCode`，不觸及其他程式碼（降低發生機率）
- 即便 `updateCode` 被呼叫並丟失功能，使用者也能從版本歷史救回（降低傷害）
- prompt 規則逼 AI 更小心（降低 AI 自己選錯路徑的機率）

## Scope

**包含**：
- 新增 `ToolCodeSnapshot` model（`id / toolId / code / explanation / createdAt`），獨立表
- Prisma migration
- `Tool` 更新時的 snapshot 機制（每次 code 實際變動才 snapshot，重複更新不入庫）
- 每個 tool 保留最近 20 筆 snapshot，超過自動刪最舊
- 新增 `editCode` AI tool：input `{ find: string, replace: string, explanation: string }`，exact string 替換；`find` 在 code 中出現 0 次或多次 → 回傳錯誤讓 AI 重試
- `updateCode` tool 保留，但 system prompt 加強：局部改用 `editCode`、整體重寫才用 `updateCode`；且 `updateCode` 時必須逐字保留未被要求更動的部分
- 工具詳情頁（`/tool/[id]`）「版本歷史」下拉：列出最近 20 筆 snapshot（explanation + createdAt），一鍵還原；還原動作本身也會先快照當前版
- API: `GET /api/tools/[id]/snapshots` 列出、`POST /api/tools/[id]/snapshots/[snapshotId]/restore` 還原

**不包含**（留給後續）：
- 跨 tool 的版本歷史總覽
- snapshot diff 視覺化（只顯示 explanation + 時間）
- 對話階段（draft tool）的 snapshot（draft 本來就能靠 chat history 重建，不另開快照）
- Undo 單一訊息的變動（只能從版本歷史還原到整版）
- 自動偵測「AI 大幅變動」並警告使用者

## Approach

### 1. Schema
新增 `ToolCodeSnapshot`：
```prisma
model ToolCodeSnapshot {
  id          String   @id @default(cuid())
  toolId      String
  code        String   @db.Text
  explanation String?
  createdAt   DateTime @default(now())

  tool Tool @relation(fields: [toolId], references: [id], onDelete: Cascade)

  @@index([toolId, createdAt])
}
```
`Tool` 加 relation `snapshots ToolCodeSnapshot[]`。

### 2. Snapshot helper `src/lib/tool-snapshot.ts`
- `snapshotBeforeUpdate(toolId, newCode, explanation?)`：若 `newCode` 與現行 `Tool.code` 不同才 snapshot 舊 code；snapshot 後若該 tool 超過 20 筆則刪最舊
- `listSnapshots(toolId)`：回最近 20 筆
- `restoreSnapshot(toolId, snapshotId)`：先 snapshot 當前版，再把 `Tool.code` 設回該 snapshot 的 code

### 3. Studio tools
- `updateCode`：呼叫 `snapshotBeforeUpdate` 再 `tool.update`
- `editCode`（新）：
  - input `{ find, replace, explanation }`
  - 讀當前 code → 檢查 `find` 出現次數
    - 0 次 → 回 `{ type: "edit_code_error", reason: "find string not found" }`
    - ≥ 2 次 → 回 `{ type: "edit_code_error", reason: "find string appears N times; add more context" }`
    - 1 次 → `new = old.replace(find, replace)`，呼叫 `snapshotBeforeUpdate` 後 `tool.update`，回 `{ type: "code_update", code: new, explanation, toolId }`
- `conversationId === null`（尚未關聯對話）情境沿用既有 draft 行為

### 4. System prompt
在 `## When to use updateCode` 區塊加：
- **Prefer `editCode` for small changes** — a bug fix, a label change, adding one field, tweaking a style. Only use `updateCode` when the user explicitly asks to rewrite / redesign / start over, or when the edit touches more than ~30% of the code.
- When calling `updateCode`, the new code **MUST preserve everything the user did not ask to change, line-by-line**. Do not remove features the user didn't mention. Do not simplify working code. If unsure, use `editCode` instead.

### 5. UI — 版本歷史
- `/tool/[id]` 頁面加「版本歷史」按鈕，點擊開 Popover / Dialog
- 列最近 20 筆：「explanation · `createdAt` 相對時間 · [還原]」
- 還原確認 dialog，執行後 toast「已還原至此版本」並 refresh

### 6. API
- `GET /api/tools/[id]/snapshots`：回 `[{ id, explanation, createdAt }, ...]`（不回 code，避免 payload 太大）
- `POST /api/tools/[id]/snapshots/[snapshotId]/restore`：驗證 ownership，呼叫 `restoreSnapshot`

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| Schema | `prisma/schema.prisma` | 新增 `ToolCodeSnapshot`、`Tool.snapshots` relation |
| Migration | `prisma/migrations/<timestamp>_add_tool_code_snapshots/` | 新增 |
| Snapshot | `src/lib/tool-snapshot.ts` | 新增 |
| AI tools | `src/lib/ai/tools.ts` | `updateCode` 加 snapshot；新增 `editCode` |
| System prompt | `src/lib/ai/system-prompt.ts` | 新增 `editCode` 指引、強化 `updateCode` 保留規則 |
| API | `src/app/api/tools/[id]/snapshots/route.ts` | 新增（GET list） |
| API | `src/app/api/tools/[id]/snapshots/[snapshotId]/restore/route.ts` | 新增（POST restore） |
| UI | `src/app/(app)/tool/[id]/...` | 版本歷史元件 |
| Tests | `src/lib/tool-snapshot.test.ts` 等 | 新增 |
