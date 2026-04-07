# System Config Specification

## Purpose

提供資料庫儲存的系統設定機制，取代 `.env` 檔案作為主要設定來源，並提供後台管理介面。

## ADDED Requirements

### Requirement: Config Storage
系統 SHALL 將設定儲存在 `SystemConfig` 資料表中，敏感值加密儲存。

#### Scenario: 讀取已設定的值
- GIVEN DB 中有 key `ANTHROPIC_API_KEY` 的記錄
- WHEN 呼叫 `getConfig("ANTHROPIC_API_KEY")`
- THEN 回傳解密後的值

#### Scenario: DB 無記錄時 fallback 到 env
- GIVEN DB 中沒有 key `ANTHROPIC_API_KEY` 的記錄
- AND `process.env.ANTHROPIC_API_KEY` 有值
- WHEN 呼叫 `getConfig("ANTHROPIC_API_KEY")`
- THEN 回傳 `process.env.ANTHROPIC_API_KEY` 的值

#### Scenario: DB 和 env 都無值
- GIVEN DB 和 process.env 都沒有該 key
- WHEN 呼叫 `getConfig("SOME_KEY")`
- THEN 回傳 `undefined`

#### Scenario: getConfigRequired 缺少必要設定
- GIVEN DB 和 process.env 都沒有該 key
- WHEN 呼叫 `getConfigRequired("GOOGLE_CLIENT_ID")`
- THEN 拋出錯誤

### Requirement: Config Caching
系統 SHALL 快取設定值以減少 DB 查詢。

#### Scenario: 快取命中
- GIVEN 同一個 key 在 60 秒內已查詢過
- WHEN 再次呼叫 `getConfig(key)`
- THEN 回傳快取值，不查詢 DB

#### Scenario: 寫入後快取失效
- GIVEN key `X` 的值被更新
- WHEN 更新完成後呼叫 `getConfig("X")`
- THEN 回傳新值

### Requirement: Admin Settings UI
系統 SHALL 提供後台頁面讓 ADMIN 管理系統設定。

#### Scenario: 檢視設定
- GIVEN 使用者為 ADMIN
- WHEN 進入 `/admin/settings`
- THEN 顯示所有設定項目，依群組分類
- AND 敏感值顯示為 masked 狀態

#### Scenario: 更新設定
- GIVEN 使用者為 ADMIN
- WHEN 修改某個設定值並儲存
- THEN 值加密寫入 DB
- AND 快取立即失效
- AND 頁面顯示更新成功

#### Scenario: 非 ADMIN 無法存取
- GIVEN 使用者為 MEMBER
- WHEN 嘗試存取 `/admin/settings`
- THEN 被導向回首頁

### Requirement: Dynamic Auth Options
系統 SHALL 動態載入 OAuth 設定，不依賴 module-level 常數。

#### Scenario: 從 DB 讀取 OAuth 設定
- GIVEN DB 中有 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
- WHEN NextAuth 處理登入請求
- THEN 使用 DB 中的值初始化 Google Provider

### Requirement: Dynamic AI Model Init
系統 SHALL 動態載入 AI API Keys，不依賴 process.env 自動讀取。

#### Scenario: 從 DB 讀取 AI API Key
- GIVEN DB 中有 `ANTHROPIC_API_KEY`
- WHEN 使用者發起 chat 請求
- THEN 使用 DB 中的 key 初始化 AI provider

### Requirement: Settings API
系統 SHALL 提供 API endpoint 讓後台讀寫設定。

#### Scenario: GET /api/admin/settings
- GIVEN 使用者為 ADMIN
- WHEN GET `/api/admin/settings`
- THEN 回傳所有設定，敏感值 masked（只回傳是否已設定）

#### Scenario: PUT /api/admin/settings
- GIVEN 使用者為 ADMIN
- WHEN PUT `/api/admin/settings` with `{ key, value }`
- THEN 加密並儲存到 DB
- AND 回傳成功
