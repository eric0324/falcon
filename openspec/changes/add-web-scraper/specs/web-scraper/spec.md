# Web Scraper Specification

## Purpose

平台內建網頁抓取能力，chat 和 tool 都能使用。

## ADDED Requirements

### Requirement: 網頁抓取
系統 SHALL 能抓取指定 URL 的網頁內容並回傳乾淨文字。

#### Scenario: 抓取正常網頁
- GIVEN 一個有效的 URL
- WHEN 呼叫 scraper
- THEN 回傳 `{ title, text, url }`，text 為移除雜訊後的乾淨文字

#### Scenario: URL 無法存取
- GIVEN 一個無法存取的 URL
- WHEN 呼叫 scraper
- THEN 回傳錯誤訊息

#### Scenario: 文字過長截斷
- GIVEN 網頁內容超過上限
- WHEN 抓取完成
- THEN 截斷並標記 `truncated: true`

### Requirement: Chat Tool
AI SHALL 能透過 `webScrape` tool 抓取網頁。

#### Scenario: AI 抓取網頁
- GIVEN 使用者提供 URL 或提到想看某網頁
- WHEN AI 判斷需要抓取
- THEN 呼叫 `webScrape({ url })` 並根據內容回答

### Requirement: Bridge API
部署的工具 SHALL 能透過 bridge 呼叫爬蟲。

#### Scenario: 工具呼叫爬蟲
- GIVEN 工具需要抓取網頁
- WHEN 呼叫 `window.companyAPI.execute("scrape", "fetch", { url })`
- THEN 回傳 `{ title, text, url }`
