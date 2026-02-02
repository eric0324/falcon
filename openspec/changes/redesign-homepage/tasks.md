# Tasks: redesign-homepage

## Task List

### Phase 1: CSS Foundation
- [ ] 1. 在 `globals.css` 新增 glassmorphism CSS 變數（亮/暗模式）
- [ ] 2. 在 `globals.css` 新增卡片動畫 utility classes

### Phase 2: Card Components
- [ ] 3. 更新 `page.tsx` 對話卡片樣式（glassmorphism + hover 動畫）
- [ ] 4. 更新 `tool-card.tsx` 樣式（glassmorphism + hover 動畫）

### Phase 3: Layout & Spacing
- [ ] 5. 更新 `page.tsx` 整體間距和排版
- [ ] 6. 更新 `navbar.tsx` 視覺效果（可選 sticky + blur）

### Phase 4: Empty State
- [ ] 7. 重新設計空狀態 UI（大 icon + 更好的文案 + CTA）

### Phase 5: Polish
- [ ] 8. 測試亮/暗模式一致性
- [ ] 9. 測試響應式佈局（手機/平板/桌面）

## Dependencies
- Task 3, 4 依賴 Task 1, 2
- Task 5 可與 Task 3, 4 並行
- Task 7 獨立
- Task 8, 9 依賴所有前置 tasks

## Verification
- 視覺檢查：卡片應有半透明毛玻璃效果
- 動畫檢查：hover 卡片應有平滑縮放
- 響應式檢查：各斷點佈局正確
- 暗模式檢查：效果在暗模式下依然美觀
