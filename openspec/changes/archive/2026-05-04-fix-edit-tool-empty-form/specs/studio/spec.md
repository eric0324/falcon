# Studio Spec Deltas — fix-edit-tool-empty-form

## ADDED Requirements

### Requirement: Edit-mode 工具載入須驗證 HTTP 狀態
Chat 頁進入工具編輯模式時，當 `/api/tools/:id` 回應為非 2xx 狀態，前端 SHALL 視為載入失敗，不得把 error body 當作工具資料填入 form state。

#### Scenario: 載入成功時填入表單
- GIVEN URL 為 `/chat?edit=:id`
- AND `/api/tools/:id` 回 200 並包含完整工具資料
- WHEN 編輯模式 effect 執行
- THEN form state（name / description / code / category / tags / visibility）依工具資料填入

#### Scenario: API 回非 2xx 時顯示錯誤而非空白
- GIVEN URL 為 `/chat?edit=:id`
- AND `/api/tools/:id` 回 401 / 403 / 404 / 500（body 為 `{ error: "..." }`）
- WHEN 編輯模式 effect 執行
- THEN form state 不被覆寫成 undefined
- AND 顯示 `loadToolError` toast（既有 catch 路徑）

#### Scenario: Network error 走相同錯誤路徑
- GIVEN URL 為 `/chat?edit=:id`
- AND fetch 因網路或其他原因 reject
- WHEN 編輯模式 effect 執行
- THEN 行為與非 2xx 一致：toast 提示載入失敗，state 不變
