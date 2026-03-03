# Proposal: redesign-homepage

## Summary
重新設計首頁，採用 Minimal Dashboard 風格，提升視覺現代感與使用者體驗。

## Motivation
目前首頁設計較為基本，缺乏視覺吸引力和現代感。使用者進入 Dashboard 時，應該感受到清爽、專業且有品質的介面。

## Goals
1. **現代化視覺風格** - 使用 glassmorphism 效果、更好的間距和排版
2. **增強互動體驗** - 加入細緻的 hover 動畫和過渡效果
3. **改善空狀態設計** - 當沒有對話或工具時，提供更好的引導
4. **保持簡潔** - 不增加功能複雜度，專注於視覺提升

## Non-Goals
- 不改變現有功能邏輯
- 不新增資料欄位或 API
- 不改變路由結構

## Scope

### In Scope
- 首頁 (`src/app/page.tsx`) 樣式重新設計
- Navbar 組件視覺更新
- ToolCard 組件樣式更新
- 對話卡片樣式更新
- 空狀態組件設計
- globals.css 新增必要的 CSS 變數和動畫

### Out of Scope
- Studio 頁面
- Marketplace 頁面
- 認證流程頁面
- API 變更

## Design Approach

### Glassmorphism 風格
- 卡片使用半透明背景 + backdrop-blur
- 細膩的邊框和陰影層次
- 保持內容可讀性

### 動畫效果
- 卡片 hover 時的平滑縮放和陰影變化
- 頁面載入時的淡入效果（可選）
- 按鈕的 hover 狀態動畫

### 排版改善
- 增加區塊間距
- 更清晰的視覺層次
- 適當的留白

### 空狀態設計
- 更大的插圖或圖示
- 清楚的引導文案
- 明確的 CTA 按鈕

## Affected Specs
- `dashboard` (NEW) - 新增首頁規格

## Dependencies
- 無外部依賴
- 使用現有 Tailwind CSS + shadcn/ui 體系
