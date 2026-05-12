# image-generation Spec Delta: unify-token-usage-tracking

調整現有「計費記錄」需求，讓 image row 改用 `kind="image"` 與 `units` 欄位。

## MODIFIED Requirements

### Requirement: 計費記錄

系統 SHALL 將圖片生成寫入 `TokenUsage`，採用 unified usage-tracking schema（`kind="image"`、`units = 圖片張數`），不再把張數塞進 `outputTokens`。

#### Scenario: 寫入 TokenUsage
- GIVEN 圖片生成成功
- WHEN tool execute 結束前
- THEN 建立一筆 `TokenUsage` 記錄
- AND `kind = "image"`
- AND `model` 為 `imagen-4` / `gpt-image-1` / `gemini-2.5-flash-image`
- AND `units = 1`（第一版固定 1 張）
- AND `inputTokens = 0`、`outputTokens = 0`、`totalTokens = 0`
- AND `costUsd` 依 pricing 表計算（`imagePricing[model] * units`）

#### Scenario: 生成失敗不計費
- GIVEN 圖片生成失敗
- WHEN tool execute 捕獲錯誤
- THEN 不寫入 `TokenUsage`
