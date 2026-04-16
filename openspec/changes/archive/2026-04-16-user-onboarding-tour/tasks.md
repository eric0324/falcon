# Tasks: user-onboarding-tour

## Phase 1: 基礎設施

- [x] 1. 安裝 `@reactour/tour` 套件
- [x] 2. 建立 `src/components/onboarding/tour-provider.tsx`，包裝 reactour 的 TourProvider，統一主色、圓角、字體樣式
- [x] 3. 建立 `src/components/onboarding/tour-button.tsx`，右上角「？」icon button，點擊觸發 `setIsOpen(true)`
- [x] 4. 建立 `src/components/onboarding/use-auto-tour.ts`，mount 時檢查 `localStorage['tour:<pageKey>']`，未看過則自動 `setIsOpen(true)` 並寫入
- [x] 5. 為 use-auto-tour 寫單元測試（mock localStorage）

## Phase 2: 首頁 tour

- [x] 6. 建立 `src/components/onboarding/steps/marketplace.ts`，定義首頁 4 步驟
- [x] 7. 在首頁相關元件補 `data-tour="marketplace-search"` 等選擇器屬性
- [x] 8. 首頁掛上 TourProvider + TourButton + useAutoTour
- [x] 9. 手動驗證：首次進首頁自動跳、再次進不跳、點「？」可重開

## Phase 3: 對話 tour

- [x] 10. 建立 `src/components/onboarding/steps/chat.ts`，定義對話 5 步驟
- [x] 11. 在對話頁相關元件補 `data-tour` 選擇器
- [x] 12. 對話頁掛上 TourProvider + TourButton + useAutoTour
- [x] 13. 手動驗證：首次跳、再次不跳、手動重開、視窗小時 popover 不爆版

## Phase 4: 收尾

- [x] 14. 更新 changelog
- [x] 15. 歸檔 change
