# Navigation Specification

## Purpose

定義側邊欄 + 極簡頂部欄的導航系統規格。

## ADDED Requirements

### Requirement: App Shell Layout

系統 SHALL 提供統一的 App Shell 佈局，包含側邊欄和頂部欄。

#### Scenario: 已登入使用者看到 App Shell
- GIVEN 使用者已登入
- WHEN 使用者訪問任何受保護頁面
- THEN 顯示左側側邊欄
- AND 顯示頂部欄
- AND 主要內容顯示在側邊欄右側

#### Scenario: 未登入使用者不看到 App Shell
- GIVEN 使用者未登入
- WHEN 使用者訪問 login 頁面
- THEN 不顯示側邊欄和頂部欄

---

### Requirement: Top Bar

系統 SHALL 提供頂部欄，包含品牌識別和快速操作入口。

#### Scenario: 顯示頂部欄元素
- WHEN 頂部欄渲染
- THEN 左側顯示側邊欄 toggle 按鈕
- AND 左側顯示 Logo
- AND 右側顯示「新對話」按鈕
- AND 右側顯示使用者頭像選單

#### Scenario: 點擊新對話按鈕
- WHEN 使用者點擊「新對話」按鈕
- THEN 導航到 `/studio`

#### Scenario: 點擊 Logo
- WHEN 使用者點擊 Logo
- THEN 導航到首頁 `/`

---

### Requirement: Sidebar Navigation

側邊欄 SHALL 提供主要導航項目。

#### Scenario: 顯示導航項目
- WHEN 側邊欄展開
- THEN 顯示「探索市集」連結（指向 `/marketplace`）
- AND 顯示「我的工具」連結（指向 `/`）

#### Scenario: 標示當前頁面
- GIVEN 使用者在某個頁面
- WHEN 側邊欄渲染
- THEN 對應的導航項目顯示為選中狀態（高亮）

#### Scenario: 導航項目點擊
- WHEN 使用者點擊導航項目
- THEN 導航到對應頁面
- AND 在行動裝置上自動收合側邊欄

---

### Requirement: Sidebar Conversation List

側邊欄 SHALL 顯示使用者的對話歷史。

#### Scenario: 顯示對話列表
- GIVEN 使用者有對話歷史
- WHEN 側邊欄展開
- THEN 顯示對話列表（最新的在前）
- AND 每個項目顯示對話標題
- AND 每個項目可點擊

#### Scenario: 對話列表為空
- GIVEN 使用者沒有對話歷史
- WHEN 側邊欄展開
- THEN 顯示空狀態提示

#### Scenario: 點擊對話項目
- WHEN 使用者點擊對話項目
- THEN 導航到 `/studio?id={conversationId}`
- AND 在行動裝置上自動收合側邊欄

#### Scenario: 標示當前對話
- GIVEN 使用者在 Studio 頁面且有 conversation id
- WHEN 側邊欄渲染
- THEN 對應的對話項目顯示為選中狀態

---

### Requirement: Sidebar Toggle

側邊欄 MUST 支援展開和收合。

#### Scenario: 點擊 toggle 按鈕展開
- GIVEN 側邊欄收合
- WHEN 使用者點擊 toggle 按鈕
- THEN 側邊欄展開
- AND toggle 按鈕圖標變更

#### Scenario: 點擊 toggle 按鈕收合
- GIVEN 側邊欄展開
- WHEN 使用者點擊 toggle 按鈕
- THEN 側邊欄收合
- AND toggle 按鈕圖標變更

#### Scenario: 記住側邊欄狀態
- GIVEN 使用者調整了側邊欄狀態
- WHEN 使用者重新載入頁面
- THEN 側邊欄維持之前的狀態

---

### Requirement: Responsive Sidebar

側邊欄 MUST 適應不同螢幕尺寸。

#### Scenario: 桌面版預設展開
- GIVEN 螢幕寬度 >= 768px
- WHEN 首次載入
- THEN 側邊欄預設展開
- AND 側邊欄為 inline 模式（推擠主內容）

#### Scenario: 行動版預設收合
- GIVEN 螢幕寬度 < 768px
- WHEN 首次載入
- THEN 側邊欄預設收合

#### Scenario: 行動版 overlay 模式
- GIVEN 螢幕寬度 < 768px
- AND 側邊欄展開
- THEN 側邊欄以 overlay 模式顯示（覆蓋主內容）
- AND 顯示半透明背景遮罩

#### Scenario: 點擊遮罩收合
- GIVEN 側邊欄以 overlay 模式展開
- WHEN 使用者點擊遮罩
- THEN 側邊欄收合

---

## MODIFIED Requirements

### Requirement: User Navigation Menu

使用者選單 SHALL 從原本的 Navbar 移至 TopBar。

#### Scenario: 顯示使用者選單
- GIVEN 使用者已登入
- WHEN 使用者點擊頭像
- THEN 顯示下拉選單
- AND 選單包含使用者資訊、登出選項

---

## REMOVED Requirements

### Requirement: Traditional Top Navbar

移除原本的傳統頂部導航列（`Navbar` 元件）。

#### Scenario: Navbar 不再使用
- WHEN 使用者訪問任何頁面
- THEN 不顯示傳統的頂部導航列

---

## UI Components

| 元件 | 說明 |
|------|------|
| `AppShell` | 整體佈局容器，包含 TopBar、Sidebar、主內容區 |
| `TopBar` | 頂部欄：toggle、logo、新對話、使用者選單 |
| `Sidebar` | 側邊欄：導航項目 + 對話列表 |
| `SidebarProvider` | Context Provider，管理側邊欄狀態 |
| `SidebarToggle` | 側邊欄展開/收合按鈕 |
| `ConversationList` | 對話歷史列表 |

## Data Model

無資料模型變更。使用現有的 `Conversation` model。

## API Endpoints

無 API 變更。使用現有的對話 API。
