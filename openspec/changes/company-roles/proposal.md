# Proposal: company-roles

## Summary

新增「公司角色」系統，取代現有 `User.department` 欄位。管理員可自訂角色（如「業務」「財務」「工程」），指派給使用者（多對多）。外部資料庫的資料表和欄位可設定哪些角色可見，LLM 根據使用者的角色過濾可參考的 schema。

## Motivation

目前外部資料庫的存取控制只有 table 層級的 `hidden` boolean，無法根據使用者的職務角色做細粒度管控。例如：財務人員可以看到薪資表，但業務人員不應該看到。需要一個彈性的角色系統來控制 LLM 對外部資料庫 schema 的可見性。

現有 `User.department` 是一個自由文字欄位，無法做結構化的權限控制，應以角色系統取代。

## Scope

### In Scope
- `CompanyRole` model：管理員可新增、編輯、刪除公司角色
- User 與 CompanyRole 多對多關聯（一個使用者可有多個角色）
- `ExternalDatabaseTable` 與 `ExternalDatabaseColumn` 各自關聯 `CompanyRole`（允許的角色清單）
- Admin 後台：角色管理 CRUD 頁面
- Admin 後台：使用者詳情頁可指派角色
- Admin 後台：Schema Browser 中可設定 table/column 的允許角色
- 新掃描的 table/column 預設所有角色皆可見

### Out of Scope
- 移除 `User.department` 欄位（暫時保留，後續再移除）
- LLM 端實際過濾邏輯（本次只建立資料模型和管理 UI，LLM 過濾在另一個 change 處理）
- 角色的階層/繼承關係

## Affected Specs
- NEW `company-roles` — 公司角色 CRUD 與管理
- MODIFIED `admin-members` — 使用者詳情頁新增角色指派
- MODIFIED `external-database` — Table/Column 新增角色可見性設定

## Risks
- 需要 DB migration：新增 `CompanyRole` model 和多對多關聯表
- 現有 `department` 資料不自動遷移到角色系統（管理員需手動建立角色並指派）
