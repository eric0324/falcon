# Dark Mode

## Summary
新增深色模式切換功能，讓使用者可以在亮色/暗色主題之間切換，並記住偏好設定。

## Motivation
- 減少長時間使用的眼睛疲勞
- 提升使用者體驗，符合現代應用程式標準
- 專案已有完整的 dark mode CSS variables 與 Tailwind 設定，實作成本極低

## Scope
- 安裝 `next-themes` 套件
- 在 root layout 加入 ThemeProvider
- 新增 theme toggle 元件（亮色/暗色/系統）
- 將 toggle 放入 sidebar 或 navbar
- 檢查並修復任何 hardcoded 顏色

## Out of Scope
- 自定義主題色票
- 每個使用者的主題偏好存入資料庫（使用 localStorage 即可）

## Risk
- **低風險**：基礎建設已就位，主要是接線工作
