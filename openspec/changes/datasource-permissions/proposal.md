# Proposal: 資料來源權限控管 - 預設唯讀

## Summary
資料庫類型的資料來源預設只允許 SELECT，禁止 INSERT / UPDATE / DELETE，需明確授權才能執行寫入操作。

## Why
- 安全性：避免工具意外或惡意修改資料
- 最小權限原則：預設給最小權限，需要時再開放
- 保護生產資料：防止 AI 生成的程式碼破壞資料
- 可審計：寫入權限需要明確授權，方便追蹤

## What Changes
- 新增 DataSourcePermission model 記錄每個 tool 對資料來源的權限
- API Bridge 檢查 SQL 類型，非 SELECT 需驗證權限
- 新增授權介面讓 tool 作者申請寫入權限
- 資料來源管理員可審核並授予權限

## Motivation
Protect production data by enforcing read-only access by default. Write operations require explicit permission grants.

## Scope

### In Scope
- SQL 解析判斷操作類型 (SELECT / INSERT / UPDATE / DELETE)
- DataSourcePermission model 設計
- API Bridge 權限檢查
- 權限不足時的錯誤處理

### Out of Scope
- Row-level 權限控制
- Column-level 權限控制
- 資料來源管理介面 (獨立 change)
- 審核流程 UI

## Success Criteria
- [ ] 預設只能執行 SELECT
- [ ] INSERT / UPDATE / DELETE 被攔截並回傳權限錯誤
- [ ] 有權限的 tool 可以執行寫入操作
- [ ] 權限記錄在資料庫中

## Dependencies
- 現有 API Bridge 實作

## Timeline
3-4 hours
