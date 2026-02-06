# Tasks: 對話自動壓縮 (Auto Compact)

## Task 1: Token 估算工具
- [x] 建立 `src/lib/ai/token-utils.ts`
- [x] 實作 `estimateTokens(text: string): number`（CJK 1 token/字，英文 0.25 token/字）
- [x] 實作 `estimateMessagesTokens(messages): number`（計算整個 messages 陣列）
- [x] 定義 `MODEL_CONTEXT_LIMITS: Record<ModelId, number>`（各 model 的 context window）
- [x] 實作 `shouldCompact(messages, modelId): boolean`（閾值 80%）
- [x] 撰寫單元測試（14 tests pass）

## Task 2: Compact 核心邏輯
- [x] 建立 `src/lib/ai/compact.ts`
- [x] 實作 `splitMessages(messages, keepCount): { oldMessages, recentMessages }`
- [x] 實作 `compactMessages(messages, modelId): Promise<CompactResult>`（整合摘要）
- [x] 定義 `CompactResult` 型別：`{ summary, compactedMessages, originalCount, keptCount }`
- [x] 撰寫單元測試（6 tests pass, mock AI 呼叫）

## Task 3: Database Schema 更新
- [x] Conversation model 新增 `summary String? @db.Text`
- [x] 執行 `prisma db push`
- [x] Conversation API (`GET /api/conversations/[id]`) 已自動回傳 summary（findUnique 回傳所有欄位）
- [x] PATCH API 支援更新 summary 欄位

## Task 4: Chat API 整合
- [x] 修改 `src/app/api/chat/route.ts`
- [x] 在 streamText 前呼叫 `shouldCompact()`
- [x] 需要壓縮時呼叫 `compactMessages()`，使用壓縮後的 messages
- [x] 新增 stream 事件類型 `c:`，傳送 compact 資訊到前端
- [x] 壓縮後將 summary 儲存到 Conversation record

## Task 5: 前端 Compact 提示
- [x] 修改 `src/app/(app)/chat/page.tsx`
- [x] 新增 `CompactInfo` interface 和 `compactInfo` state
- [x] 解析 `c:` stream 事件
- [x] 在 messages 列表前顯示 compact indicator（分隔線 + 提示文字）
- [x] 新對話時重置 compactInfo state

## 依賴關係

```
Task 1 ← Task 2 ← Task 4
                ← Task 3 ← Task 4
                          Task 5（可與 Task 4 平行）
```

- Task 1、Task 3 可平行開發
- Task 2 依賴 Task 1
- Task 4 依賴 Task 2 + Task 3
- Task 5 可在 Task 4 完成前先做 UI 部分
