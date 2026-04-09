# Tasks: add-web-scraper

- [ ] 1. 安裝 cheerio
- [ ] 2. 建立 `src/lib/scraper.ts` — fetch + cheerio 解析 + 截斷
- [ ] 3. 建立 `src/lib/ai/scraper-tools.ts` — webScrape tool 定義
- [ ] 4. 修改 `src/app/api/chat/route.ts` — 註冊 webScrape tool
- [ ] 5. 修改 `src/lib/bridge/handlers.ts` — 新增 scrape handler
- [ ] 6. 修改 `src/lib/ai/system-prompt.ts` — 新增 scraper 使用說明
- [ ] 7. 為 scraper.ts 寫 unit test
