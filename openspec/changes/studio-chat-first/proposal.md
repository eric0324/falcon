# Proposal: Studio Chat-First 體驗

## Summary
將 Studio 從「工具建立器」轉為「對話優先」介面。使用者進入即可對話，不需先命名工具；預覽面板僅在產生程式碼時才出現；發布按鈕僅在有程式碼時顯示。

## Why
目前 Studio 強制使用者進入時先填工具名稱才能開始對話，但實際使用情境更多元：
- 只想問問某個功能怎麼做
- 想查看某個資料來源的資料
- 先探索需求，還不確定要做什麼工具
- 做簡單的資料計算，不需要產生 UI

現行流程預設「每次進來都是要做工具」，這不符合真實使用行為。

## What Changes
1. 移除 InitialSetupDialog — 進入 Studio 直接開始對話
2. 自適應版面 — 預設全寬對話，產生程式碼後自動分割為左右面板
3. 條件式 Header — 發布/儲存按鈕僅在有程式碼時出現
4. 更新 System Prompt — 不再強制輸出程式碼，能根據使用者意圖自然回應

## Scope

### In Scope
- 移除 InitialSetupDialog 及相關 state
- Studio page 自適應 layout（全寬 ↔ 50/50 分割）
- Header 按鈕條件顯示
- System prompt 調整為對話導向
- DeployDialog 已有完整欄位，不需修改

### Out of Scope
- 對話歷史持久化（屬於 studio-history change）
- 新增其他對話模式或 tab
- PreviewPanel 元件內部改動

## Success Criteria
- [ ] 進入 Studio 不彈出任何 dialog，直接可輸入
- [ ] 純對話場景下（無程式碼）畫面為全寬聊天
- [ ] AI 產出程式碼後自動展開預覽面板
- [ ] 有程式碼時才出現發布按鈕
- [ ] 發布時 DeployDialog 正常運作

## Dependencies
- 現有 Studio 實作（studio-enhancements 已完成）
