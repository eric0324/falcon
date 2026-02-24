# Proposal: external-db-query

## Summary

讓前台聊天介面可以選擇外部資料庫作為資料來源，LLM 透過 tool use 自動分析使用者問題、選擇相關資料表和欄位、組合 SQL 查詢，並回傳查詢結果給使用者。

## Motivation

後台已建立外部資料庫連線管理和 schema 掃描機制，但前台還無法使用這些資料。需要將外部資料庫整合到聊天流程，讓使用者能用自然語言查詢公司資料庫。

## Scope

### In Scope
- DataSourceSelector 新增「外部資料庫」分類，列出使用者有權存取的資料庫
- 建立 LLM tools：查看可用資料表、查看欄位詳情、執行 SQL 查詢
- System prompt 注入外部資料庫的 schema 資訊和使用指南
- SQL 查詢結果回傳給 LLM 做分析和回答
- 根據使用者的 companyRoles 過濾可見的 table/column
- 查詢結果限制（row limit）防止過大回傳

### Out of Scope
- 寫入操作（INSERT/UPDATE/DELETE）— 僅支援 SELECT
- 查詢結果的視覺化圖表
- 查詢歷史記錄
- 跨資料庫 JOIN

## Affected Specs
- MODIFIED `data-source-selector` — 新增外部資料庫選項
- NEW `external-db-query` — LLM tool 和查詢執行邏輯

## Risks
- SQL injection：必須用 read-only 方式執行，並加上 LIMIT
- 大量資料回傳：需限制行數和欄位大小
- 連線逾時：外部資料庫可能慢或不可用
