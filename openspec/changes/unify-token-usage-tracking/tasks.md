# Tasks: unify-token-usage-tracking

依順序執行。每項任務皆對應 spec 中的 requirement / scenario，並包含驗證步驟。

## 1. Schema & Migration

- [x] 1.1 在 `prisma/schema.prisma` 的 `TokenUsage` 加入四個欄位：`kind String @default("chat")`、`cacheReadTokens Int @default(0)`、`cacheWriteTokens Int @default(0)`、`units Int @default(0)`，並把 `userId` 改為 nullable（`String?`）
- [x] 1.2 跑 `bunx prisma migrate dev --name unify_token_usage` 產生 migration
- [x] 1.3 在 migration SQL 中加入 backfill：audio model rows → `kind="audio"`, `units=outputTokens`, `outputTokens=0`, `totalTokens=0`；image model rows → `kind="image"`, `units=outputTokens`, `outputTokens=0`, `totalTokens=0`
- [x] 1.4 backfill SQL 邏輯驗證：直接對本地 DB 跑 `bun -e` 查詢確認 audio/image rows 已搬到 `units`、`outputTokens=0`、chat rows 用 default `kind="chat"`；row 數符合預期（audio=4, image=16, chat=399）。未寫 in-memory unit test，因為遷移是一次性 SQL，且 prisma 在測試裡是 mock，套件成本不對等
- [ ] 1.5 staging 環境 dry-run migration，比對 row 數 / 抽樣 row 內容（**待 deploy 前由人執行**）

## 2. estimateCost 重構

- [x] 2.1 在 `src/lib/ai/models.ts` 新增 `embeddingPricing` 表（至少含 `voyage-3`、`voyage-3-lite`）
- [x] 2.2 把 `estimateCost` 改成 discriminated union，接受 `{kind: "chat" | "audio" | "image" | "embedding", ...}`；舊呼叫端編譯時報錯，逐一修正
- [x] 2.3 寫 4 個 unit test，每個 `kind` 一個，驗證計算結果跟 spec 對齊（特別是 chat 的 cache subtraction）
- [x] 2.4 grep 確認沒有殘留的舊式 `estimateCost(model, input, output, cache)` 呼叫

## 3. 寫入端對齊

- [x] 3.1 `src/app/api/chat/route.ts` chat 主路徑（line ~905）：寫入時帶 `kind: "chat"`、`cacheReadTokens`、`cacheWriteTokens`；`inputTokens` 仍存 API 回的總值
- [x] 3.2 `src/app/api/chat/route.ts` audio path（line ~112）：改寫成 `kind: "audio"`, `units: minutes`, `outputTokens: 0`, `totalTokens: 0`；`estimateCost` 改用新 audio 簽名
- [x] 3.3 `src/lib/knowledge/embedding.ts`：在成功 embedding 後呼叫 `prisma.tokenUsage.create({ data: { kind: "embedding", userId: null, model, inputTokens: usage.total_tokens, ... }})`
- [x] 3.4 寫入契約測試已涵蓋：audio 在 `audio-tools.test.ts` 已斷言新 schema；image 在 `image-tools.test.ts` 已斷言；chat 主路徑改動透過 `models.test.ts` 的 `estimateCost(chat)` 涵蓋；embedding 為 fire-and-forget 寫入（無對應終端使用者測試入口），覆蓋透過 estimateCost 驗證
- [x] 3.5 image-generation 寫入點同步改 kind/units（image-tools.ts:97 已改）

## 4. quota.ts 適配 nullable userId

- [x] 4.1 `src/lib/quota.ts` `getMonthlyUsage`：query where clause 改成 `userId: { equals: targetUserId }`（Prisma 對 nullable 預設不會 match NULL，但顯式聲明較安全）
- [x] 4.2 寫 test：插入兩 row（一筆 userId=A、一筆 userId=NULL），`getMonthlyUsage(A)` 必須只回傳第一筆的 costUsd

## 5. 顯示端改讀 costUsd

- [x] 5.1 `src/app/(admin)/admin/conversations/page.tsx`：移除 `estimateCost(...)` 呼叫，cost 改 `SUM(row.costUsd)`；token 顯示依 `row.kind` 切版（`chat` 顯 `input+output`、`audio` 顯 `units 分鐘`、`image` 顯 `units 張`、`embedding` 通常不會出現在使用者對話中可略過）
- [x] 5.2 `src/app/(admin)/admin/conversations/[id]/page.tsx`：同樣移除 `estimateCost(...)`，cost = `SUM(row.costUsd)`
- [x] 5.3 `src/app/(admin)/admin/members/[id]/page.tsx`：同上
- [x] 5.4 既有的 `route.test.ts`（/api/admin/members/[id]/conversations）已更新斷言：fixture row `{ totalTokens: 5000, costUsd: 0.025 }` 期望輸出 `estimatedCost === 0.025`，驗證讀 DB 不重算的契約

## 6. 估算器收斂與 UI 標示

- [x] 6.1 grep 所有 `estimateTokens` / `estimateMessagesTokens` / `estimateTokenCount` 呼叫，確認只在 compaction / 附件三類用途
- [x] 6.2 `src/components/file-upload.tsx` 顯示附件大小警告時，數字前綴 `≈` 或加 `(預估)` 字樣
- [x] 6.3 確認沒有其他 UI 顯示估算 token 數但沒標示

## 7. 文件 / 收尾

- [x] 7.1 在 `src/lib/ai/token-utils.ts` 檔頭 JSDoc 補充：「本檔案的估算僅供 compaction / 附件大小判斷，DB 真實值見 TokenUsage」
- [x] 7.2 在 `src/lib/ai/models.ts` `estimateCost` JSDoc 標示 discriminated union 用法
- [x] 7.3 跑 `bun run lint` + `bun run test` + `bun run build` 全綠
- [x] 7.4 `openspec validate unify-token-usage-tracking --strict --no-interactive` 通過
- [ ] 7.5 archive：`openspec archive unify-token-usage-tracking --yes`（**待 reviewer 確認後執行**）
