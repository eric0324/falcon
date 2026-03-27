# Proposal: Add Vimeo Data Source

## Change ID
`add-vimeo-datasource`

## Summary
新增 Vimeo 作為資料來源，讓使用者在聊天室中串接 Vimeo 帳號，AI 可以查詢影片資料與觀看分析，產生報表工具。

## Motivation
公司內部有夥伴使用 Vimeo 管理影片內容，目前需要手動登入 Vimeo 後台查看數據。串接後可以直接用 Falcon 產生影片分析儀表板、比較影片表現等。

## Scope

### In Scope
- Vimeo OAuth 2.0 認證流程（授權、callback、token 儲存與刷新）
- AI 工具定義：查詢影片清單、影片詳情、資料夾、觀看分析
- Bridge handler：已發布工具的 runtime 資料存取
- 資料來源選擇器 UI 新增 Vimeo 選項
- 連線狀態 API 更新

### Out of Scope
- 影片上傳、編輯、刪除（只做唯讀查詢）
- Vimeo Live 直播相關功能
- Showcase（合輯）管理

## Approach
沿用現有 Google/YouTube OAuth 整合模式：
1. 獨立的 OAuth 流程（authorize → callback → token 儲存）
2. Token 加密存入 DB，自動刷新
3. 用 Vimeo REST API 直接呼叫（不用官方 SDK，保持一致性）
4. 單一 AI tool（`vimeoQuery`）搭配 `action` 參數，與 `youtubeQuery` 模式一致

## Dependencies
- Vimeo 付費方案（Pro 以上）才能存取 Analytics API（`stats` scope）
- 需要在 developer.vimeo.com 建立 OAuth App 取得 Client ID / Secret

## Risks
- Vimeo Analytics 需要付費方案，若帳號沒有付費則分析功能不可用（需要 graceful fallback）
- Vimeo API rate limit 約 100 req/min，需注意不要在 AI 工具中做過多連續呼叫
