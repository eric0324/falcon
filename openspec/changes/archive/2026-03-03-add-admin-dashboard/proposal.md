# Proposal: add-admin-dashboard

## Summary

新增管理員後台，讓 ADMIN 角色的使用者可以查看所有成員的 token 使用量，並點進去查看個別成員的對話串。

## Motivation

目前沒有方式讓管理者了解平台的使用狀況——誰在用、用了多少 token、聊了什麼。需要一個後台讓管理者掌握這些資訊。

## Scope

### In Scope
- Admin 角色驗證（API + 頁面層）
- 成員列表頁：顯示所有使用者及其 token 使用量
- 成員對話串頁：顯示指定使用者的所有對話，可展開查看訊息內容

### Out of Scope
- 管理者修改/刪除使用者資料
- 管理者修改/刪除對話
- 使用者角色管理 UI（手動在 DB 設定 ADMIN）
- Token 用量的圖表/趨勢分析

## Affected Specs
- `auth` — ADDED: Admin 角色驗證 requirement
- NEW `admin-members` — 成員列表與對話串查看

## Risks
- 無：DB schema 已有 `User.role`、`TokenUsage`、`Conversation` 等完整結構，無需 migration
