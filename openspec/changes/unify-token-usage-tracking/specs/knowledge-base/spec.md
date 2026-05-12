# knowledge-base Spec Delta: unify-token-usage-tracking

新增 Embedding 計費紀錄需求。目前 Voyage AI 的 embedding 呼叫拿到 `usage.total_tokens` 後就丟掉，沒入庫、沒計費。本變更要求寫入 `TokenUsage`，但 `userId=NULL`（計為系統成本，不扣使用者 quota）。

## ADDED Requirements

### Requirement: Embedding 成本計入 TokenUsage

The system SHALL record every successful embedding call into `TokenUsage` with `kind="embedding"` and `userId=NULL`, so that platform embedding spend is observable without burdening individual users' quotas.

#### Scenario: 成功 embedding 寫入系統 row

- GIVEN 一次 Voyage embedding 呼叫成功，API 回傳 `usage.total_tokens = 320`
- WHEN 呼叫端拿到回應
- THEN 建立一筆 `TokenUsage` 記錄
- AND `kind = "embedding"`
- AND `userId = NULL`
- AND `model = "voyage-3"` （或實際使用的 model 名稱）
- AND `inputTokens = 320`、`outputTokens = 0`、`totalTokens = 320`
- AND `units = 0`、`cacheReadTokens = 0`、`cacheWriteTokens = 0`
- AND `costUsd = embeddingPricing[model] * 320 / 1_000_000`

#### Scenario: 失敗 embedding 不寫入

- GIVEN Voyage embedding API 回傳錯誤或網路失敗
- WHEN 呼叫端 catch error
- THEN 不建立 `TokenUsage` 記錄

#### Scenario: Embedding 成本不扣使用者 quota

- GIVEN admin 上傳一份知識庫文件觸發 100 次 embedding，產生總計 $0.30 的系統成本
- WHEN 該 admin 隨後檢查自己的 quota 用量
- THEN `getMonthlyUsage(adminUserId)` 不包含這 $0.30
- AND 該 $0.30 仍可透過系統級報表（例如 `SUM(costUsd) WHERE userId IS NULL`）查到
