# integrate-ga4: Tasks

## Task 1: Install dependency
- [ ] `npm install @google-analytics/data`
- **驗證**: package.json 包含 `@google-analytics/data`

## Task 2: GA4 Client
- [ ] 建立 `src/lib/integrations/ga4/client.ts`
  - `isGA4Configured()` — 檢查 client_email + private_key + property_id
  - `getClient()` — 建立並快取 `BetaAnalyticsDataClient` 實例
  - `getRealtimeUsers()` — `runRealtimeReport()` 取即時活躍用戶
  - `queryAggregate(dateRange, filters?)` — `runReport()` 聚合指標（6 個核心 metrics）
  - `queryTimeseries(dateRange, period, filters?)` — `runReport()` 時間序列
  - `queryBreakdown(dimension, dateRange, filters?, limit?)` — `runReport()` 維度拆分
  - dateRange 轉換：簡化字串 → GA4 startDate/endDate
  - dimension 映射：短名 → GA4 API 名稱
  - filter 轉換：扁平參數 → GA4 dimensionFilter
  - private_key `\n` 換行處理
  - 回傳型別定義（GA4Metrics, GA4TimeseriesEntry, GA4BreakdownEntry, GA4Filters）
- [ ] 建立 `src/lib/integrations/ga4/index.ts` re-export
- [ ] 建立 `src/lib/integrations/ga4/client.test.ts` 單元測試
- **驗證**: `npm test -- ga4/client` 全綠

## Task 3: GA4 AI Tool
- [ ] 建立 `src/lib/ai/ga4-tools.ts`
  - `createGA4Tools()` 回傳 `{ ga4Query }` 工具
  - action: realtime / aggregate / timeseries / breakdown
  - Zod schema：action, dateRange, period, dimension, page, source, country, device, event, startDate, endDate, limit
  - 回傳輕量格式（同 Plausible 的 success/service/data/hint 結構）
- [ ] 建立 `src/lib/ai/ga4-tools.test.ts` 單元測試
- **驗證**: `npm test -- ga4-tools` 全綠

## Task 4: Route Integration
- [ ] `src/app/api/chat/route.ts`: import ga4Tools，加入 dataSources 過濾邏輯
- [ ] `src/app/api/integrations/status/route.ts`: 回報 `ga4: isGA4Configured()`
- **驗證**: `/api/integrations/status` 回傳 ga4 狀態

## Task 5: System Prompt
- [ ] `src/lib/ai/system-prompt.ts`: 加入 GA4 使用指南區塊
  - 可用 actions 說明
  - dimension 選項列表
  - dateRange 選項列表
  - filter 用法範例
- **驗證**: 選擇 GA4 資料來源時，system prompt 包含指南

## Task 6: UI Integration
- [ ] `src/components/data-source-selector.tsx`:「網站數據」子選單加入 GA4 選項（BarChart icon）
- [ ] `src/components/tool-call-display.tsx`: 加入 ga4Query 的圖示和標籤
- [ ] 更新 i18n（en.json, zh-TW.json）：加入 ga4 name/description
- [ ] `.env.example`: 加入 `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`, `GA4_PROPERTY_ID`
- **驗證**: UI 中可以選擇/取消 GA4，狀態正確顯示

## Dependencies
- Task 1 → Task 2（client 依賴套件）
- Task 2 → Task 3（tools 依賴 client）
- Task 3 → Task 4（route 依賴 tools）
- Task 2 → Task 4（status route 依賴 client）
- Task 5、Task 6 可與 Task 3 平行
