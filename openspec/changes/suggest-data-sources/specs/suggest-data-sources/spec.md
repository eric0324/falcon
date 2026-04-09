# Suggest Data Sources Specification

## Purpose

AI 主動偵測使用者需要的資料來源，透過 tool call 在對話中顯示勾選 UI，引導使用者啟用正確的資料來源。

## ADDED Requirements

### Requirement: AI 建議資料來源
當使用者的問題涉及未開啟的資料來源時，AI SHALL 呼叫 suggestDataSources tool 建議開啟。

#### Scenario: 使用者問廣告數據但沒選 Meta Ads
- GIVEN 使用者沒有選擇任何資料來源
- WHEN 使用者問「幫我看上週的廣告成效」
- THEN AI 呼叫 suggestDataSources({ sources: ["meta_ads"], reason: "..." })

#### Scenario: 使用者問 Notion 資料但沒選 Notion
- GIVEN 使用者沒有選擇 Notion
- WHEN 使用者問「幫我查 Notion 上的請假規則」
- THEN AI 呼叫 suggestDataSources({ sources: ["notion"], reason: "..." })

#### Scenario: 使用者問題涉及多個資料來源
- GIVEN 使用者沒有選擇資料來源
- WHEN 使用者問「比較 GA4 和 Meta Ads 的數據」
- THEN AI 呼叫 suggestDataSources({ sources: ["ga4", "meta_ads"], reason: "..." })

### Requirement: 前端勾選 UI
前端 SHALL 將 suggestDataSources tool call 渲染為可互動的資料來源勾選元件。

#### Scenario: 顯示建議的資料來源
- GIVEN AI 呼叫了 suggestDataSources
- THEN 在對話中顯示勾選 UI，建議的來源預先勾選
- AND 顯示 AI 提供的 reason

#### Scenario: 使用者確認勾選
- GIVEN 勾選 UI 已顯示
- WHEN 使用者按確認按鈕
- THEN 勾選的資料來源同步到工具列的 DataSourceSelector
- AND 自動重送使用者最後一則訊息

#### Scenario: 使用者取消
- GIVEN 勾選 UI 已顯示
- WHEN 使用者不按確認
- THEN 不做任何操作，對話維持原狀

### Requirement: suggestDataSources 永遠可用
suggestDataSources tool SHALL 不受 dataSources 過濾影響，永遠註冊在 tools 中。

#### Scenario: 沒選任何資料來源時仍可呼叫
- GIVEN 使用者沒有選擇任何資料來源
- WHEN AI 需要建議資料來源
- THEN suggestDataSources tool 可被呼叫
