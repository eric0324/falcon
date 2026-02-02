# Tasks: redesign-navbar

## Phase 1: 基礎架構

- [x] **Task 1.1**: 建立 `SidebarProvider` context
  - 建立 `src/components/sidebar-provider.tsx`
  - 實作 `isOpen`, `toggle`, `close` 狀態
  - 實作 localStorage 持久化
  - 實作響應式預設值（桌面展開、行動收合）

- [x] **Task 1.2**: 建立 `TopBar` 元件
  - 建立 `src/components/top-bar.tsx`
  - 包含 SidebarToggle、Logo、新對話按鈕、UserNav
  - 高度 h-14，固定在頂部

- [x] **Task 1.3**: 建立 `Sidebar` 元件
  - 建立 `src/components/sidebar.tsx`
  - 實作展開/收合動畫
  - 實作桌面 inline 模式
  - 實作行動 overlay 模式 + 遮罩

- [x] **Task 1.4**: 建立 `ConversationList` 元件（整合進 Sidebar）
  - 整合在 `src/components/sidebar.tsx` 內
  - 顯示對話列表
  - 標示當前選中的對話
  - 處理空狀態

## Phase 2: 整合佈局

- [x] **Task 2.1**: 建立 `AppShell` 元件
  - 建立 `src/components/app-shell.tsx`
  - 整合 TopBar、Sidebar
  - 載入對話列表（Server Component）
  - 傳遞 user 和 conversations 給子元件

- [x] **Task 2.2**: 重構 route groups
  - 建立 `src/app/(app)/` 目錄
  - 移動 `page.tsx` 到 `(app)/`
  - 移動 `marketplace/` 到 `(app)/`
  - 移動 `studio/` 到 `(app)/`
  - 移動 `tool/` 到 `(app)/`
  - 建立 `src/app/(app)/layout.tsx` 使用 AppShell

- [x] **Task 2.3**: 建立 auth route group
  - 建立 `src/app/(auth)/` 目錄
  - 移動 `login/` 到 `(auth)/`
  - 建立 `src/app/(auth)/layout.tsx`（不使用 AppShell）

## Phase 3: 頁面清理

- [x] **Task 3.1**: 清理首頁
  - 移除 `Navbar` 引用
  - 調整佈局（移除最外層容器）
  - 確保內容正確顯示

- [x] **Task 3.2**: 清理市集頁面
  - 移除 `Navbar` 引用
  - 調整佈局
  - 確保分類和工具列表正確顯示

- [x] **Task 3.3**: 調整 Studio 頁面
  - 移除內部的 ConversationList（改用全局 Sidebar）
  - 調整 header 樣式
  - 確保對話介面正常運作

- [x] **Task 3.4**: 清理其他頁面
  - 檢查所有使用 Navbar 的頁面
  - 移除 Navbar 引用
  - 調整佈局

## Phase 4: 測試與收尾

- [ ] **Task 4.1**: 撰寫單元測試
  - 測試 SidebarProvider 狀態邏輯
  - 測試 ConversationList 渲染

- [ ] **Task 4.2**: 撰寫元件測試
  - 測試 TopBar 元素渲染
  - 測試 Sidebar 展開/收合
  - 測試導航項目路由

- [x] **Task 4.3**: 移除舊元件
  - 刪除 `src/components/navbar.tsx`
  - 刪除 `src/components/conversation-list.tsx`
  - 確認無其他檔案引用

- [ ] **Task 4.4**: 手動驗證
  - 測試桌面版展開/收合
  - 測試行動版 overlay 模式
  - 測試導航項目跳轉
  - 測試對話列表點擊
  - 測試新對話按鈕
  - 測試使用者選單

## 依賴關係

```
Task 1.1 ──┐
Task 1.2 ──┼──→ Task 2.1 ──→ Task 2.2 ──→ Task 3.x
Task 1.3 ──┤                    │
Task 1.4 ──┘                    └──→ Task 2.3

Task 3.x ──→ Task 4.x
```

## 可並行執行

- Task 1.1 ~ 1.4 可同時進行
- Task 3.1 ~ 3.4 可同時進行
- Task 4.1 ~ 4.2 可同時進行
