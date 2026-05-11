# Proposal: WebinarJam 唯讀 AI 工具

## 概述

新增 `webinarjam-connector` capability，讓使用者在聊天時可勾選 WebinarJam 作為資料來源，AI 透過 `webinarjamQuery` tool 列出 webinars、查單一 webinar 詳情、撈某場次的報名與出席名單。本案完全唯讀，不做 register / unsubscribe 等寫入動作。

## 動機

- 使用者目前要看 webinar 報名 / 出席資料只能登 WebinarJam dashboard 手動查
- 既有 9 個 integrations 已驗證「config + integrations 模組 + AI tool + chat route 接點」這套 pattern 穩定
- WebinarJam 的 `registrants` 端點本身就支援按出席 / 重播 / 購買狀態 server-side 篩選，AI 拿到後可直接回答「上週 webinar 誰沒來」「誰看了 replay 但沒買」這類查詢，token 與延遲都可控

## 目標

1. `src/lib/integrations/webinarjam/` 新增 client，封裝 3 個 endpoint：`/webinars`、`/webinar`、`/registrants`
2. `src/lib/ai/webinarjam-tools.ts` 提供 `webinarjamQuery` tool，action 列舉：`list` / `get` / `registrants`
3. `registrants` action 支援關鍵 server-side filter：`attendedLive`（0-4）、`attendedReplay`（0-4）、`purchased`（0-2）、`search`、`page`
4. tool description 明確列出各 filter 數字代表意義，避免 AI 亂猜
5. `WEBINARJAM_API_KEY` 註冊到 `src/lib/config.ts`，沿用既有加密儲存機制
6. `webinarjam` 作為 data source 接到 chat route 的 `selectedSources` 篩選邏輯
7. 跟既有 vimeo / asana 模式一致：admin 設定頁、data-source-selector、integrations status API 全部登記

## 非目標

- 不做 `register` / `unsubscribe` 等寫入動作（會發確認信給陌生人，風險高，留到 Phase 2 另案）
- 不支援 EverWebinar（API 共用 key 但 base path 不同，且 schedule 語意不一樣，留到日後若有需求再加）
- 不做 webhook 接收（WebinarJam webhook 沒有簽章驗證、無公開事件 schema，先觀察）
- 不做匯入到知識庫（webinar attendee 資料是動態的、不適合做靜態知識文件）
- 不做 `date_range` / `attendedLiveTimestamp` 等較少用的 filter，保持 tool 表面精簡

## 影響範圍

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/integrations/webinarjam/client.ts` | API client + `isWebinarjamConfigured()` |
| `src/lib/integrations/webinarjam/index.ts` | 重新匯出 |
| `src/lib/integrations/webinarjam/client.test.ts` | 單元測試 |
| `src/lib/ai/webinarjam-tools.ts` | `createWebinarjamTools()` |
| `src/lib/ai/webinarjam-tools.test.ts` | 單元測試 |

### 需修改的檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/config.ts` | 新增 `webinarjam` section 含 `WEBINARJAM_API_KEY` |
| `src/app/api/chat/route.ts` | import + `selectedSources.has("webinarjam")` 分支 + `isWebinarjamConfigured` 加入 integration checks |
| `src/app/api/integrations/status/route.ts` | 加入 webinarjam 狀態 |
| `src/app/(app)/chat/page.tsx` | data source label |
| `src/app/(admin)/admin/settings/settings-client.tsx` | settings label |
| `src/components/data-source-selector.tsx` | 加入 state shape、defaults、名稱解析 |
| i18n 檔（如有 `integrations.vimeo.name` 之類） | 補 `integrations.webinarjam.name` 等翻譯 key |

## 風險

| 風險 | 緩解措施 |
|------|----------|
| API base URL 文件不一致（PDF 寫 `webinarjam.genndi.com`、support page 寫 `api.webinarjam.com`） | 採新版 `api.webinarjam.com/webinarjam`；遇到 404 / 連不上時錯誤訊息清楚標 base URL，方便 fallback 排查 |
| Rate limit 20 req/sec | AI 對話幾乎不會碰到；不做 in-memory limiter，遇到 429 直接把錯誤訊息回給 AI 由它退避 |
| filter 數字參數 AI 容易亂用 | Zod 用 `z.union([z.literal(0), z.literal(1), ...])` 收縮選項；tool description 完整列出每個數字代表的意義 |
| `registrants` 大 webinar 可能上千筆 | 預設只回第 1 頁（API 預設分頁），tool description 提示 AI「先回一頁、需要更多再翻 page」 |
| `webinar_id` 與 `schedule_id` 型別在 API 不一致（PDF: schedule 是 int；registrants: schedule_id 也 int；webinar_id 是 string） | client 嚴格照 API 型別宣告，tool 介面對 AI 也照樣 |
| GDPR：API 直接報名沒徵詢同意 | 本案唯讀，**不會**觸發此風險；register 留到 Phase 2 再處理 |

## 驗收標準

1. `WEBINARJAM_API_KEY` 設定後，`isWebinarjamConfigured()` 回 true，chat UI data source 選單出現 WebinarJam 選項
2. AI 呼叫 `webinarjamQuery({ action: "list" })` 回傳所有 webinars 含 `webinar_id`、`name`、`type`、`schedules`、`timezone`
3. AI 呼叫 `webinarjamQuery({ action: "get", webinarId })` 回 webinar 詳情含 schedules 陣列（含 schedule ID）、presenters、registration_url
4. AI 呼叫 `webinarjamQuery({ action: "registrants", webinarId, scheduleId })` 回該場次完整名單
5. AI 加 `attendedLive: 2` filter，名單只剩有出席直播的人；同理 `purchased: 1` 只回購買者
6. 同時帶 `attendedLive: 1` 與 `purchased: 0` 兩 filter，server-side 同時生效
7. `page: 2` 取下一頁分頁
8. 未設定 API key → 回 `{ success: false, needsConnection: true, service: "webinarjam", error: ... }`
9. WebinarJam API 回 `status: "error"` → 把 message 透傳給 AI
10. 整套單元測試全綠
