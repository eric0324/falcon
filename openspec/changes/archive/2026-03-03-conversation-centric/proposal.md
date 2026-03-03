# Proposal: Conversation-Centric Architecture

## Summary
將系統的基本單位從 Tool 轉為 Conversation。對話是主體，工具是對話的可能產物。

## Why
目前系統以 Tool 為核心：使用者進入 Studio「建立工具」，對話紀錄附屬在 Tool 上。但實際使用情境中，使用者可能：

- 只想問問題、查資料、做計算，不需要產出工具
- 一個對話探索多個方向，最終才決定要不要做成工具
- 同一個對話過程中產出多個工具

現有的架構已有獨立的 `Conversation` model，但應用層仍以 Tool 為主體：
- 對話只在 deploy 時才被持久化
- 首頁只顯示 Tool 列表
- Studio 的對話活在 React state，重整就消失

一個對話最多產出一個工具（1:0..1 關係）。

## What Changes

### 1. Schema 擴充
`Conversation` model 新增欄位：
- `title`: 對話標題（從第一則訊息自動產生）
- `model`: 使用者選擇的 AI 模型
- `dataSources`: 選擇的資料來源

### 2. 對話自動持久化
每次訊息交換即時存入資料庫，不再只在 deploy 時才儲存。

### 3. 首頁導航調整
首頁從純 Tool 列表，改為包含最近對話入口。

### 4. Studio 載入/恢復對話
透過 URL 參數 `/studio?id={conversationId}` 可以恢復任何歷史對話。

## Scope

### In Scope
- Conversation schema 擴充（title, model, dataSources）
- Conversation CRUD API
- 對話自動儲存機制
- 首頁增加最近對話區塊
- Studio 從 URL 載入對話

### Out of Scope
- 對話側邊欄 UI（由 studio-history 覆蓋，可後續實作）
- 對話搜尋/分類
- 對話分享
- 對話匯出

## Relationship to Existing Changes
- **studio-history**: 該 proposal 聚焦在 Studio 側邊欄 UI。本 proposal 提供其所需的 schema 和 API 基礎。studio-history 可在本 proposal 完成後實作。
- **studio-chat-first**: 已完成。本 proposal 延續其方向，將「對話優先」從 UI 層推進到資料架構層。

## Success Criteria
- [ ] Conversation 有獨立的 title、model、dataSources 欄位
- [ ] 每次訊息交換後對話自動存入 DB
- [ ] 重整頁面後可透過 URL 恢復對話
- [ ] 首頁顯示最近對話列表
- [ ] Tool deploy 時關聯到已存在的 Conversation（不再另建）

## Dependencies
- studio-chat-first（已完成）
