# Proposal: Leaderboards

## Summary
Create leaderboard pages showing tool rankings by various metrics.

## Why
- 排行榜遊戲化工具創建，鼓勵使用者分享優質工具
- 幫助使用者快速發現最受歡迎的工具
- 不同排名類型服務不同需求（熱門 vs 評價 vs 新星）
- 提供工具發現的另一個入口

## What Changes
- 新增 `src/app/marketplace/leaderboard/page.tsx` - 排行榜頁面
- 更新 `src/app/marketplace/page.tsx` - 加入排行榜入口按鈕
- 實作四種排名：本週熱門、最高評價、使用最多、新星崛起
- 前三名顯示金色排名徽章

## Motivation
Leaderboards gamify tool creation and help users find the best tools. Different ranking types serve different user needs (what's hot now vs. proven favorites).

## Scope

### In Scope
- Leaderboard page with tabs
- Weekly trending ranking
- Highest rated ranking
- Most used (all-time) ranking
- Rising stars ranking (new tools gaining traction)
- Department rankings

### Out of Scope
- Personal stats dashboard
- Creator leaderboard
- Achievement badges

## Success Criteria
- [x] Leaderboard page with multiple ranking tabs
- [ ] Weekly trending resets correctly (deferred - needs cron job)
- [x] Highest rated uses weighted formula
- [x] Rising stars highlights new tools
- [x] Rankings update in near real-time


## Dependencies
- `marketplace-browse` change completed

## Timeline
3-4 hours
