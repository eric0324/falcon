# Unify Token Usage Tracking

## Why

目前 token 的計算、紀錄、顯示散落在四處，彼此語意不一致，導致：

1. **同一個欄位代表不同東西**：`TokenUsage.outputTokens` 在 chat row 是 completion tokens，在 audio row 是「分鐘數」，在 image row 是「圖片張數」。後續任何彙總、報表、查詢都得先猜 model 名稱再翻譯欄位語意。
2. **寫入時的 cost 跟顯示時的 cost 不一致**：寫入 `chat/route.ts` 時把 Anthropic prompt cache 拆出來、用 nonCachedInput + cacheRead + cacheWrite 算出正確 `costUsd`；但 admin 頁面顯示時拿 `inputTokens`（已含 cache）重新 call `estimateCost()` — 算出來的數字一定偏高，跟實際請款金額對不上。
3. **DB 已存的 `costUsd` 被完全忽略**：三個 admin 顯示點都重算成本，永遠不讀 `costUsd` 欄位 — 等於那個欄位只有寫沒有用。
4. **Cache token 寫入時消失**：billing 算對了，但 `cacheReadTokens / cacheWriteTokens` 沒入庫。任何 audit、report、cache 命中率分析都做不到。
5. **Embedding 完全沒紀錄**：`src/lib/knowledge/embedding.ts` 拿到 Voyage 回的 `total_tokens` 後直接丟掉，這部分支出無人追蹤。
6. **`estimateTokens` 字元啟發式跟 API 實際回傳值兩套並存且互不對齊**：使用者前端看到的「預估」永遠跟 DB 存的「實際」不同，也沒有明確標示哪個是估的。

## What Changes

### Schema（單一 migration、不拆表）

`TokenUsage` 新增 4 個欄位：

- `kind: String @default("chat")` — `"chat" | "audio" | "image" | "embedding"`
- `cacheReadTokens: Int @default(0)`
- `cacheWriteTokens: Int @default(0)`
- `units: Int @default(0)` — non-token billing 單位（audio=分鐘、image=張數）

Migration 同時 backfill 既有資料：
- model ∈ `audioPricing` → `kind="audio"`, `units = outputTokens`, `outputTokens = 0`
- model ∈ `imagePricing` → `kind="image"`, `units = outputTokens`, `outputTokens = 0`
- 其他 → `kind="chat"`（cache 欄位歷史資料保持 0，無法回溯）

### estimateCost 改 discriminated union

不再靠 model 名稱猜計費模式，呼叫端必須明確傳 `kind`：

```ts
estimateCost({ kind: "chat", model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens })
estimateCost({ kind: "audio", model, minutes })
estimateCost({ kind: "image", model, imageCount })
estimateCost({ kind: "embedding", model, inputTokens })
```

### 寫入端對齊（3 處）

1. `src/app/api/chat/route.ts` chat 主路徑 — 寫 `kind="chat"`，同時保存 `cacheReadTokens / cacheWriteTokens`。
2. `src/app/api/chat/route.ts` audio transcription 路徑 — 寫 `kind="audio"`、`units=minutes`、`outputTokens=0`（不再硬塞 minutes 進 outputTokens）。
3. `src/lib/knowledge/embedding.ts` — 新增寫入點，`kind="embedding"`、`userId=null`（**系統成本**，不扣使用者 quota）。

未來 image generation 改寫時亦同（本變更不動實作，但 spec 對齊）。

### 顯示端對齊（3 處）

`admin/conversations/page.tsx`、`admin/conversations/[id]/page.tsx`、`admin/members/[id]/page.tsx` — 全部改讀 DB `costUsd` 欄位，不再 call `estimateCost()` 重算。Token 數依 `kind` 切版顯示：

- `chat` → `{input + output} tokens`
- `audio` → `{units} 分鐘`
- `image` → `{units} 張`
- `embedding` → `{inputTokens} tokens`

### estimateTokens 範圍收斂並標示

`estimateTokens` 啟發式估算器保留，但限定用於三類 **事前無法取得實際數字** 的場景：
- compaction 判斷（`shouldCompact`、`trimMessagesToFit`）
- attachment 大小檢查（`classifyAttachmentSize`）
- attachment 內容截斷（`truncateHead`、`truncateCsvSmart`）

UI 上凡是顯示估算值（如附件大小警告）一律標 `≈` 或「預估」，與 DB 實際值區分。

### Quota 維持 USD

`UserQuota` schema 不動。所有 quota 檢查改透過 `getMonthlyUsage()` 加總 `costUsd`（已含全部 kind）。System-level usage（userId=null）不計入任何使用者 quota。

## Impact

- **Affected specs**:
  - `usage-tracking`（新建 capability spec — 統一 TokenUsage schema、estimateCost 契約、quota 計算邏輯）
  - `audio-transcription`（MODIFIED — billing row 改用 kind/units）
  - `image-generation`（MODIFIED — billing row 改用 kind/units）
  - `admin-conversations`（MODIFIED — 顯示讀 DB `costUsd`）
  - `knowledge-base`（MODIFIED — 新增 embedding usage 紀錄）

- **Affected code**:
  - `prisma/schema.prisma` — TokenUsage 加 4 欄位、新 migration
  - `src/lib/ai/models.ts` — `estimateCost` 改 discriminated union
  - `src/app/api/chat/route.ts` — chat / audio 寫入點
  - `src/lib/knowledge/embedding.ts` — 新增寫入
  - `src/lib/quota.ts` — `getMonthlyUsage` 自動忽略 `userId=null` row
  - `src/app/(admin)/admin/conversations/page.tsx` — 讀 `costUsd`
  - `src/app/(admin)/admin/conversations/[id]/page.tsx` — 讀 `costUsd`
  - `src/app/(admin)/admin/members/[id]/page.tsx` — 讀 `costUsd`

- **Breaking changes**: 無外部 API 變動。內部函式 `estimateCost()` 簽名改變，所有呼叫端必須一次更新。
- **Migration risk**: backfill 在同一 transaction 中跑，需事先在 staging 驗證 row 數與計算正確性。
