# Proposal: Studio 歷史對話紀錄

## Summary
在 Studio 左側新增歷史對話紀錄列表，讓使用者可以瀏覽和繼續之前的對話。

## Why
- 使用者可能中斷工作，需要稍後繼續
- 可以參考之前建立工具的對話過程
- 提供類似 ChatGPT 的使用體驗

## What Changes
- Studio 左側新增可收合的側邊欄
- 顯示歷史對話列表（按時間排序）
- 點擊可載入該對話繼續
- 可刪除不需要的對話
- 新增「新對話」按鈕

## Motivation
Allow users to resume previous conversations and reference past tool creation processes.

## Scope

### In Scope
- 左側側邊欄 UI
- 對話列表（標題、時間、工具名稱）
- 載入歷史對話
- 刪除對話
- 新建對話

### Out of Scope
- 對話搜尋
- 對話分類/資料夾
- 對話分享

## Success Criteria
- [ ] 左側顯示歷史對話列表
- [ ] 點擊對話可載入完整歷史
- [ ] 可以刪除對話
- [ ] 可以開始新對話
- [ ] 側邊欄可收合

## Dependencies
- 現有 Conversation model

## Timeline
3-4 hours
