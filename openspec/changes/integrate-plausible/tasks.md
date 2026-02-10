# integrate-plausible: Tasks

## Task 1: Plausible Client
- [ ] 建立 `src/lib/integrations/plausible/client.ts`
  - `isPlausibleConfigured()` — 檢查 API key + site ID
  - `plausibleQuery()` — 封裝 v2 POST API（JSON body）
  - `getRealtimeVisitors()` — v1 GET realtime endpoint
  - `queryAggregate(dateRange, filters?)` — 聚合指標（6 個核心 metrics）
  - `queryTimeseries(dateRange, period, filters?)` — 時間序列
  - `queryBreakdown(dimension, dateRange, filters?)` — 維度拆分
  - filter 參數轉換：扁平參數 → Plausible v2 filter 格式
  - 回傳型別定義（PlausibleMetrics, PlausibleTimeseriesEntry, PlausibleBreakdownEntry）
- [ ] 建立 `src/lib/integrations/plausible/index.ts` re-export
- [ ] 建立 `src/lib/integrations/plausible/client.test.ts` 單元測試
- **驗證**: `npm test -- plausible/client` 全綠

## Task 2: Plausible AI Tool
- [ ] 建立 `src/lib/ai/plausible-tools.ts`
  - `createPlausibleTools()` 回傳 `{ plausibleQuery }` 工具
  - action: realtime / aggregate / timeseries / breakdown
  - Zod schema：action, dateRange, period, dimension, page, source, country, device, utm_source, utm_medium, utm_campaign, startDate, endDate, limit
  - 回傳輕量格式（同其他整合的 success/service/data/hint 結構）
- [ ] 建立 `src/lib/ai/plausible-tools.test.ts` 單元測試
- **驗證**: `npm test -- plausible-tools` 全綠

## Task 3: Route Integration
- [ ] `src/app/api/chat/route.ts`: import plausibleTools，加入 dataSources 過濾邏輯
- [ ] `src/app/api/integrations/status/route.ts`: 回報 `plausible: isPlausibleConfigured()`
- **驗證**: `/api/integrations/status` 回傳 plausible 狀態

## Task 4: System Prompt
- [ ] `src/lib/ai/system-prompt.ts`: 加入 Plausible 使用指南區塊
  - 可用 actions 說明
  - dimension 選項列表
  - dateRange 選項列表
  - filter 用法範例
- **驗證**: 選擇 Plausible 資料來源時，system prompt 包含指南

## Task 5: UI Integration
- [ ] `src/components/data-source-selector.tsx`: 第三方服務加入 Plausible 選項（BarChart3 icon）
- [ ] `src/components/tool-call-display.tsx`: 加入 plausibleQuery 的圖示和標籤
- [ ] 更新 i18n（en.json, zh-TW.json）：加入 plausible name/description
- [ ] `.env.example`: 加入 `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, `PLAUSIBLE_BASE_URL`
- **驗證**: UI 中可以選擇/取消 Plausible，狀態正確顯示

## Dependencies
- Task 1 → Task 2（tools 依賴 client）
- Task 2 → Task 3（route 依賴 tools）
- Task 1 → Task 3（status route 依賴 client）
- Task 4、Task 5 可與 Task 2 平行
