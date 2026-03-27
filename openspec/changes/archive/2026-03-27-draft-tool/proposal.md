# Proposal: Draft Tool — Auto-create on Code Generation

## Change ID
`draft-tool`

## Summary
AI 產生程式碼的當下就自動建立草稿工具（DRAFT），讓工具在整個開發過程中都有 toolId 可用。「部署」改為「發布」，只是更新 metadata 和切換 status。

## Motivation
目前工具在使用者點「部署」之前不存在於 DB，導致預覽階段沒有 toolId。這讓需要 toolId 的功能（如未來的 tooldb）無法在開發階段使用。將工具建立時機提前到 AI 產生 code 的瞬間，從根本上解決這個問題。

## Scope

### In Scope
- Tool model 新增 `status` 欄位（DRAFT / PUBLISHED）
- AI 呼叫 updateCode 時，自動建立 DRAFT 工具（或更新已有草稿的 code）
- ToolRunner 在開發階段就有 toolId，bridge 完整可用
- DeployDialog 從「建立工具」改為「發布工具」（更新 metadata + status → PUBLISHED）
- Marketplace、公開頁面排除 DRAFT 工具
- 每次 updateCode 都同步更新草稿的 code 欄位
- Sidebar 對話列表不顯示 DRAFT 工具的標記

### Out of Scope
- Tool Database（tooldb）功能
- ARCHIVED 狀態
- 草稿列表管理 UI（使用者不需要看到草稿列表，草稿跟對話綁定）

## Approach
在 chat page 的 `setCode()` 觸發點，自動 POST 建立草稿或 PATCH 更新草稿。草稿透過 conversationId 和工具一對一綁定，同一個對話只會有一個草稿。

## Risks
- 大量草稿累積：使用者隨便聊聊就建了草稿，需要定期清理機制（可之後再做）
- 既有工具沒有 status：migration 需要把所有現有工具設為 PUBLISHED
