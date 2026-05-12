# Design: Unify Token Usage Tracking

## Context

token 計量目前是一個「四個入口、三個出口、四種 kind、兩套單位」混在一起的狀態：

- 入口（寫入點）：chat 主路徑、audio transcription、（未來）image generation、embedding（目前漏寫）
- 出口（顯示點）：admin/conversations 列表、conversations 詳情、members 詳情、未來的 billing 報表
- kind：chat、audio、image、embedding
- 單位：tokens（chat/embedding）vs. 自定義 units（audio=分鐘、image=張）

現在所有 row 擠在同一張 `TokenUsage` 表，且 `outputTokens` 同一欄被當三種東西用。`estimateCost()` 內部靠 model 名稱猜要走哪個分支（imagePricing / audioPricing / modelPricing）。寫入端寫對了 `costUsd`，但顯示端每次都重算 — 重算時拿的是 raw token 欄位、不是寫入時的 cache 拆分，所以一定算錯。

本設計的目標是把 **語意（kind）顯式化、寫入端集中、顯示端只讀 `costUsd`、估算器收斂用途**，而不是大幅重構表結構或拆出 service。

## Goals / Non-Goals

**Goals**
- TokenUsage 每一 row 有明確 `kind`，欄位語意不再 overload
- `costUsd` 是成本顯示的唯一來源（single source of truth）
- Cache token 完整入庫，可審計、可分析命中率
- Embedding 支出有紀錄（暫計為系統成本，不扣使用者 quota）
- `estimateTokens` 啟發式只用於事前估算，UI 上明確標示為「預估」

**Non-Goals**
- 不拆 TokenUsage 成多張表（暫不必要的複雜度）
- 不改 `UserQuota` schema，quota 持續以 USD 計
- 不改 compaction 70% 閾值或估算係數
- 不重寫 `linkOrphanTokenUsage` 邏輯（單獨議題，本變更不動）
- 不改前端使用者可見的 quota UI 文案

## Decisions

### 決定 1：擴充欄位、不拆表

**選項**
A. 加 4 個欄位（kind / cacheReadTokens / cacheWriteTokens / units）保持單表 ✅
B. 拆成 `LlmUsage / AudioUsage / ImageUsage / EmbeddingUsage` 四張表
C. 完全不動 schema、只改寫入端 + 顯示端讀 costUsd

**選 A**。理由：
- Quota 查詢只要 `SUM(costUsd) WHERE userId=? AND createdAt >= ?` — 拆表會逼 quota.ts 做 4-way union，查詢複雜度顯著上升
- 顯示端依 kind 切版即可，欄位 NULL/0 邏輯可控
- 一次 migration 加 4 個 column + backfill，比拆表小很多
- B 的語意潔淨度好但代價過高；C 解決不了 outputTokens 欄位語意 overload 的根本問題

### 決定 2：`inputTokens` 含 cache、`cacheRead/Write` 額外存

**選項**
A. `inputTokens` 存 API 回傳原值（含 cache），另存 `cacheReadTokens / cacheWriteTokens` ✅
B. `inputTokens` 存 nonCachedInput，cache 另存

**選 A**。理由：
- Anthropic / OpenAI API 回傳的 `usage.inputTokens` 本來就是「總 prompt tokens」概念，A 保留 raw API 值較直覺
- nonCachedInput = `inputTokens - cacheRead - cacheWrite`，永遠可從 A 算出 B；反過來不行
- 顯示端只想看「這次用了多少 prompt token」時，`inputTokens` 就是答案，不必組合

### 決定 3：顯示端只讀 `costUsd`，不重算

**選項**
A. 顯示讀 DB `costUsd`，定價變動不影響歷史 ✅
B. 顯示永遠用當前定價重算

**選 A**。理由：
- 寫入時的 `costUsd` 才是實際請款金額；admin 看到的應該跟使用者實際被扣的對得上
- 若定價真的調整，新 row 自然反映新價；舊 row 不應被「視覺上重算」誤導
- 若有需要顯示「以最新定價估算的歷史成本」，再加新欄位或 view，不必改主流程

### 決定 4：Embedding 計為系統成本（userId=null）

**選項**
A. 寫 `userId=null`，`getMonthlyUsage()` 自動忽略 ✅
B. 計到觸發 embedding 的使用者頭上、扣 quota
C. 完全不寫 DB

**選 A**。理由：
- Embedding 觸發點多半是 admin 上傳知識庫文件，難對應到單一終端使用者
- 金額小（Voyage ~$0.02-0.06/M tokens）、扣 quota 體感差
- 寫進 DB 但 `userId=null` 仍可彙總、做月度報表
- C 失去全部可見度，最差選項

### 決定 5：`estimateTokens` 留用、但 UI 上標示

**選項**
A. 留 char-based 估算器，限用於 compaction / 附件檢查；UI 顯示加 `≈` ✅
B. 換 tiktoken / gpt-tokenizer 真正 encode
C. 全部砍掉

**選 A**。理由：
- compaction 判斷在送 request 之前發生，當下根本拿不到 API usage，不可能避免估算
- tiktoken 對 Claude / Gemini 不準（不同家 tokenizer 不同），多裝套件換來的精度提升不對等成本
- 真正的解是把「估算」跟「實際」明確分開（前者只用於閾值判斷、UI 標 `≈`；後者進 DB），不是把估算器換掉

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| Backfill 跑錯導致歷史 row outputTokens 被清掉 | 在 migration 中先 dry-run、log row 數；transaction wrap；先上 staging 驗證 |
| `estimateCost` 改 discriminated union 後漏改 caller | TypeScript 編譯時就會報；caller 數量可控（grep 確認 < 10 處） |
| 顯示端切換到 `costUsd` 後若該欄位曾存錯，視覺上呈現錯誤 | 寫入端的 cost 計算邏輯本身沒改，只是讀的地方換來源；風險主要在 backfill 後的舊資料是否需要重算 costUsd |
| Embedding 計為系統成本後，admin 看不到「某個 user 觸發多少 embedding」 | 可選：保留 `triggeredByUserId` 欄位但不扣 quota。本變更暫不加，未來需要時再補 |

## Migration Plan

1. **Schema migration** — 加 `kind / cacheReadTokens / cacheWriteTokens / units` 四欄，全部給 default
2. **Data backfill SQL**（同一 migration 內）：
   ```sql
   UPDATE "TokenUsage"
     SET kind = 'audio', units = "outputTokens", "outputTokens" = 0, "totalTokens" = 0
     WHERE model IN ('gpt-4o-mini-transcribe','gpt-4o-transcribe','whisper-1');

   UPDATE "TokenUsage"
     SET kind = 'image', units = "outputTokens", "outputTokens" = 0, "totalTokens" = 0
     WHERE model IN ('imagen-4','gpt-image-1','gemini-2.5-flash-image');

   -- 其他 row 用 default kind='chat'，無需 UPDATE
   ```
3. **Code 改動**（同 PR 一次合）：
   - `estimateCost` 改成 discriminated union
   - chat / audio 寫入點補 kind / cache 欄位
   - 三個 admin 顯示點改讀 `costUsd`
   - `embedding.ts` 新增寫入（userId=null）
4. **驗證**：unit test 確認 `estimateCost(kind=chat, ...)` 結果跟舊 `estimateCost(model, input, output, cache)` 對齊；integration test 跑一次 chat → 確認 DB row 含 kind 與 cache 欄位。

## Open Questions

- 是否需要加 `triggeredByUserId` 欄位給 embedding，方便日後做「哪個使用者觸發了多少 embedding 成本」分析？— 本變更先不加，預設 `userId=null` 即可。
- `linkOrphanTokenUsage` 的 2 分鐘窗口是否該擴大？— 屬獨立議題，本變更不處理。
