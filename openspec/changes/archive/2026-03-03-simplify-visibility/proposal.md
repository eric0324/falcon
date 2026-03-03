# Proposal: 簡化 Visibility 層級

## Summary
移除 DEPARTMENT visibility 層級和 User.department 欄位，簡化為 PRIVATE / COMPANY / PUBLIC 三種。

## Why
- 簡化權限模型，降低複雜度
- 避免部門資料同步問題
- COMPANY 層級已足夠滿足內部分享需求
- 減少對 Google Directory API 的依賴

## What Changes
- 移除 `Visibility.DEPARTMENT` enum 值
- 移除 `User.department` 欄位
- 更新所有 visibility 檢查邏輯
- 清理相關的 UI 和 API 程式碼

## Motivation
Simplify the permission model by removing DEPARTMENT visibility. COMPANY level sharing is sufficient for internal tool sharing needs.

## Scope

### In Scope
- Prisma schema: 移除 DEPARTMENT enum 值
- Prisma schema: 移除 User.department 欄位
- Migration: 將現有 DEPARTMENT tools 改為 COMPANY
- 更新 marketplace/leaderboard visibility filter
- 更新 tool page access check
- 移除 VisibilitySelect 的 DEPARTMENT 選項

### Out of Scope
- Google Workspace 整合 (不再需要)
- 其他權限機制

## Success Criteria
- [ ] Visibility enum 只有 PRIVATE / COMPANY / PUBLIC
- [ ] User model 無 department 欄位
- [ ] 現有 DEPARTMENT tools 遷移至 COMPANY
- [ ] 所有 visibility 檢查正確運作

## Dependencies
- None

## Timeline
2-3 hours


