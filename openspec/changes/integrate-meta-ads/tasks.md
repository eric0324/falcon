# integrate-meta-ads: Tasks

## Task 1: Meta Ads Client
- [ ] 建立 `src/lib/integrations/meta-ads/client.ts`
  - `isMetaAdsConfigured()` — 檢查 access_token + account_id
  - `queryOverview(dateRange, startDate?, endDate?)` — 帳戶層級總覽（8 核心 metrics + actions）
  - `queryCampaigns(dateRange, limit?, startDate?, endDate?)` — 行銷活動層級（level=campaign）
  - `queryTimeseries(dateRange, period?, startDate?, endDate?)` — 每日趨勢（time_increment）
  - `queryBreakdown(dimension, dateRange, startDate?, endDate?)` — 維度拆分（breakdowns）
  - dateRange 轉換：簡化字串 → Meta time_range { since, until }
  - dimension 映射：短名 → Graph API breakdowns 名稱
  - actions 陣列完整回傳
  - 回傳型別定義（MetaAdsMetrics, MetaAdsTimeseriesEntry, MetaAdsBreakdownEntry, MetaAdsCampaignEntry）
- [ ] 建立 `src/lib/integrations/meta-ads/index.ts` re-export
- [ ] 建立 `src/lib/integrations/meta-ads/client.test.ts` 單元測試
- **驗證**: `npm test -- meta-ads/client` 全綠

## Task 2: Meta Ads AI Tool
- [ ] 建立 `src/lib/ai/meta-ads-tools.ts`
  - `createMetaAdsTools()` 回傳 `{ metaAdsQuery }` 工具
  - action: overview / campaigns / timeseries / breakdown
  - Zod schema：action, dateRange, period, dimension, startDate, endDate, limit
  - 回傳輕量格式（同 Plausible 的 success/service/data/hint 結構）
- [ ] 建立 `src/lib/ai/meta-ads-tools.test.ts` 單元測試
- **驗證**: `npm test -- meta-ads-tools` 全綠

## Task 3: Route Integration
- [ ] `src/app/api/chat/route.ts`: import metaAdsTools，加入 dataSources 過濾邏輯
- [ ] `src/app/api/integrations/status/route.ts`: 回報 `meta_ads: isMetaAdsConfigured()`
- **驗證**: `/api/integrations/status` 回傳 meta_ads 狀態

## Task 4: System Prompt
- [ ] `src/lib/ai/system-prompt.ts`: 加入 META_ADS_INSTRUCTIONS 區塊
  - 可用 actions 說明
  - dimension 選項列表
  - dateRange 選項列表
  - 策略建議
- [ ] 更新 system-prompt.test.ts 加入測試
- **驗證**: 選擇 Meta Ads 資料來源時，system prompt 包含指南

## Task 5: UI Integration
- [ ] `src/components/data-source-selector.tsx`:「網站數據」子選單加入 Meta Ads 選項（Megaphone icon）
- [ ] `src/components/tool-call-display.tsx`: 加入 metaAdsQuery 的圖示和標籤
- [ ] 更新 i18n（en.json, zh-TW.json）：加入 meta_ads name/description
- [ ] `.env.example`: 加入 `META_ADS_ACCESS_TOKEN`, `META_ADS_ACCOUNT_ID`
- **驗證**: UI 中可以選擇/取消 Meta Ads，狀態正確顯示

## Dependencies
- Task 1 → Task 2（tools 依賴 client）
- Task 2 → Task 3（route 依賴 tools）
- Task 1 → Task 3（status route 依賴 client）
- Task 4、Task 5 可與 Task 2 平行
