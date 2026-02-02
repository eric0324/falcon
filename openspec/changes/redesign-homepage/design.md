# Design: redesign-homepage

## Overview
本文件描述首頁重新設計的技術實作方式。

## Design Decisions

### 1. Glassmorphism 實作方式

使用 Tailwind CSS 實現 glassmorphism 效果：

```css
/* 新增 CSS 變數 */
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.2);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

/* Dark mode */
--glass-bg: rgba(30, 41, 59, 0.7);
--glass-border: rgba(255, 255, 255, 0.1);
```

```html
<!-- 卡片樣式 -->
<div class="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl
            border border-white/20 dark:border-white/10
            shadow-lg rounded-2xl">
```

### 2. 動畫系統

使用 Tailwind 的 transition utilities + CSS custom properties：

```css
/* 卡片 hover 效果 */
.card-hover {
  @apply transition-all duration-300 ease-out;
  @apply hover:scale-[1.02] hover:shadow-xl;
  @apply hover:-translate-y-1;
}
```

動畫時間統一為：
- 快速互動：150ms
- 一般過渡：300ms
- 強調效果：500ms

### 3. 間距系統

採用 8px 基準的間距系統：

| 用途 | Tailwind | 像素 |
|------|----------|------|
| 卡片內距 | p-6 | 24px |
| 區塊間距 | space-y-12 | 48px |
| Grid gap | gap-6 | 24px |
| 標題下方 | mb-6 | 24px |

### 4. 空狀態設計

空狀態包含：
- 大型 icon 或插圖（使用 Lucide icon，尺寸 64px）
- 標題文字（text-xl font-semibold）
- 說明文字（text-muted-foreground）
- CTA 按鈕（primary variant，較大尺寸）

### 5. 顏色調整

保持現有 primary 藍色系，但增加 subtle 背景變化：

```css
/* 頁面背景漸層（可選） */
.dashboard-bg {
  background: linear-gradient(
    135deg,
    hsl(var(--background)) 0%,
    hsl(var(--muted)) 100%
  );
}
```

## Component Changes

### globals.css
- 新增 glassmorphism 相關 CSS 變數
- 新增動畫 keyframes（如需要）

### page.tsx (首頁)
- 更新整體 layout 間距
- 套用新的卡片樣式類別
- 改善空狀態 UI

### navbar.tsx
- 微調間距
- 考慮 sticky 效果 + backdrop-blur

### tool-card.tsx
- 套用 glassmorphism 卡片樣式
- 加入 hover 動畫

## Alternatives Considered

### 1. 使用 Framer Motion
- 優點：更豐富的動畫控制
- 缺點：新增依賴、bundle size 增加
- 決定：不採用，Tailwind transition 已足夠

### 2. 完全重寫卡片組件
- 優點：可完全客製化
- 缺點：破壞現有 shadcn/ui 一致性
- 決定：不採用，在現有組件上疊加樣式

## Risk Assessment

| 風險 | 影響 | 緩解 |
|------|------|------|
| backdrop-blur 效能 | 中 | 限制使用範圍，只用於卡片 |
| 深色模式相容性 | 低 | 測試雙模式確保效果一致 |
| 瀏覽器支援 | 低 | backdrop-blur 支援度已很高 |
