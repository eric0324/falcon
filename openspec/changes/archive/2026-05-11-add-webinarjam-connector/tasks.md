# Tasks: WebinarJam 唯讀 AI 工具

## Task 1: WebinarJam API client

- [x] `src/lib/integrations/webinarjam/client.ts`
  - [x] 常數：`WEBINARJAM_BASE_URL = "https://api.webinarjam.com/webinarjam"`
  - [x] `isWebinarjamConfigured()`：檢查 `WEBINARJAM_API_KEY`
  - [x] `webinarjamFetch<T>(path, body)`：POST 帶 `api_key` 在 body，response 非 200 或 status:"error" 時 throw `WebinarjamApiError`，附原 message
  - [x] `listWebinars()`：POST `/webinars`，回 `Webinar[]`
  - [x] `getWebinar(webinarId)`：POST `/webinar`，回 `WebinarDetail`
  - [x] `getRegistrants(params)`：POST `/registrants`，接 `webinarId / scheduleId / attendedLive? / attendedReplay? / purchased? / search? / page?`
  - [x] 型別：`Webinar`、`WebinarDetail`、`Registrant`、`Schedule`、`Presenter`
- [x] `src/lib/integrations/webinarjam/index.ts`：重新匯出
- [x] `src/lib/integrations/webinarjam/client.test.ts`：用 mock fetch 驗各端點正確帶 api_key、URL、body；403/網路錯誤/`status: "error"` 路徑

## Task 2: AI tool

- [x] `src/lib/ai/webinarjam-tools.ts` 建立 `createWebinarjamTools()` 回傳 `{ webinarjamQuery: tool({ ... }) }`
- [x] `inputSchema`：
  - [x] `action`: `z.enum(["list", "get", "registrants"]).optional()`，預設 list
  - [x] `webinarId`: 字串，optional（get / registrants 必填，runtime 檢查）
  - [x] `scheduleId`: number，optional（registrants 必填）
  - [x] `attendedLive`: `z.union([z.literal(0), ..., z.literal(4)]).optional()`，describe 完整列出每個數字意義
  - [x] `attendedReplay`: 同上
  - [x] `purchased`: 0/1/2
  - [x] `search`: string optional
  - [x] `page`: number optional，預設 1
- [x] `execute`：
  - [x] 檢查 `isWebinarjamConfigured`，沒設定回 `needsConnection: true`
  - [x] dispatch 三個 action
  - [x] runtime 檢查 `get` 必有 `webinarId`、`registrants` 必有 `webinarId + scheduleId`，缺則回友善錯誤
  - [x] 包 try/catch，client 拋出的 `WebinarjamApiError` 訊息透傳給 AI
- [x] tool description：說明三個 action、filter 數字含義、提醒 schedule ID 要先 get 才知道
- [x] `src/lib/ai/webinarjam-tools.test.ts`：
  - [x] 三個 action 各一例
  - [x] 缺 webinarId 的 get / 缺 scheduleId 的 registrants 回錯誤
  - [x] filter 組合（attendedLive + purchased）正確傳到 client
  - [x] 未設定 key 路徑

## Task 3: config 註冊

- [x] `src/lib/config.ts` 的 `CONFIG_DEFINITIONS` 加：
  ```ts
  webinarjam: [
    { key: "WEBINARJAM_API_KEY", description: "API Key", sensitive: true },
  ],
  ```

## Task 4: 串到 chat route

- [x] `src/app/api/chat/route.ts`
  - [x] import `createWebinarjamTools` 與 `isWebinarjamConfigured`
  - [x] `selectedSources.has("webinarjam")` 分支（lazy 建 tools，仿 vimeo 寫法）
  - [x] integration checks 加一行 `isWebinarjamConfigured().then(...)`

## Task 5: UI / status / i18n

- [x] `src/app/api/integrations/status/route.ts` 加 webinarjam
- [x] `src/app/(app)/chat/page.tsx` data source label `webinarjam: "WebinarJam"`
- [x] `src/app/(admin)/admin/settings/settings-client.tsx` label 同上
- [x] `src/components/data-source-selector.tsx`：state shape、defaults、value.includes("webinarjam") 名稱解析
- [x] i18n 翻譯 key（如果有對應檔，補 zh / en 各一）

## Task 6: 收尾

- [x] `npx tsc --noEmit` 與 `npm test` 全綠
- [x] 手動測試：
  - [x] 在 admin 設定 `WEBINARJAM_API_KEY`
  - [x] chat 頁面看到 WebinarJam 出現在 data source 選單
  - [x] 對話：「列出我的 webinars」「上週 X webinar 誰來了」「誰看了 replay」
- [x] changelog 加一筆 patch 版本（v0.29.2），showDialog 預設 false
- [x] `openspec archive add-webinarjam-connector --yes`

## 依賴關係

```
Task 1 ← Task 2 ← Task 4
Task 1 ← Task 3 ← Task 4
              ← Task 5
                ← Task 6
```

Task 1 / 2 / 3 可平行起頭（Task 1 寫 client + tests；Task 3 是純 config 一行；Task 2 等 Task 1 client 介面定型）。
