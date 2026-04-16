# Proposal: add-web-scraper

## Summary

新增內建網頁爬蟲能力，讓 AI 可以抓取網頁內容來回答問題，部署的工具也能透過 bridge API 呼叫。架構與 LLM bridge 相同 — 平台內建、永遠可用、不需要選擇資料來源。

## Motivation

使用者經常想讓 AI 看某個網頁的內容，例如「幫我看這個網頁寫了什麼」、「幫我抓這個網站的產品價格」。目前沒有這個能力，AI 只能說「我無法存取網頁」。

## Scope

- 單一 URL 抓取，不跟隨連結
- 靜態 HTML 抓取，不處理 JavaScript 渲染的 SPA
- 輸出乾淨文字，供 LLM 使用

## Approach

### 1. 核心模組 `src/lib/scraper.ts`
- fetch URL → 取得 HTML
- 用 cheerio 解析 HTML → 移除 script/style/nav 等雜訊 → 萃取乾淨文字
- 回傳 `{ title, text, url }`

### 2. Chat Tool `webScrape`
- AI 可呼叫 `webScrape({ url })` 抓取網頁內容
- 永遠註冊，不受 dataSources 過濾
- System prompt 加入指引

### 3. Bridge Handler `scrape`
- 工具可呼叫 `window.companyAPI.execute("scrape", "fetch", { url })`
- 在 bridge handlers 加入 `scrape` dispatcher

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| 核心 | `src/lib/scraper.ts` | 新增 |
| Chat tool | `src/lib/ai/scraper-tools.ts` | 新增 |
| Chat route | `src/app/api/chat/route.ts` | 註冊 webScrape tool |
| Bridge | `src/lib/bridge/handlers.ts` | 新增 scrape handler |
| System prompt | `src/lib/ai/system-prompt.ts` | 新增 scraper 使用說明 |
| 依賴 | `package.json` | 新增 cheerio |
