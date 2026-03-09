# Dark Mode Specs

## SPEC-1: Theme Provider

### Description
應用程式必須支援亮色、暗色、系統偏好三種主題模式。

### Requirements
- R1: 使用 `next-themes` 的 `ThemeProvider` 包裹應用程式
- R2: 預設主題為 `system`（跟隨系統設定）
- R3: 主題切換時不可出現 flash（使用 `attribute="class"` + `suppressHydrationWarning`）
- R4: 使用者的主題選擇透過 localStorage 持久化

### Scenarios
- S1: 首次造訪 → 跟隨系統偏好
- S2: 切換至暗色 → 頁面即時切換，重新整理後維持暗色
- S3: 切換至系統 → 跟隨 OS 設定

## SPEC-2: Theme Toggle 元件

### Description
在 sidebar 底部的 User Menu dropdown 中提供主題切換選項。

### Requirements
- R1: 放在 User Menu dropdown 內，與語言切換並列
- R2: 點擊可在亮色/暗色之間切換
- R3: 使用 Sun/Moon icon 表示當前狀態
- R4: 顯示文字標籤（如「淺色模式」/「深色模式」）

### Scenarios
- S1: 亮色模式下 → 顯示 Sun icon + 「淺色模式」，點擊切換至暗色
- S2: 暗色模式下 → 顯示 Moon icon + 「深色模式」，點擊切換至亮色
