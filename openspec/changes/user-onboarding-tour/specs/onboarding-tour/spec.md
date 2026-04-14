# Onboarding Tour Specification

## Purpose

提供互動式使用者引導 tour，以 popover 指向實際 UI 元素讓新手了解各頁面的功能與操作。本版涵蓋首頁（marketplace）與對話（chat）兩頁。

## ADDED Requirements

### Requirement: 首次造訪自動開啟 tour
使用者首次造訪一個有 tour 的頁面時，系統 SHALL 自動開啟該頁面的 tour。

#### Scenario: 首次進入首頁
- GIVEN 使用者 localStorage 沒有 `tour:marketplace` 鍵
- WHEN 使用者造訪首頁
- THEN 首頁 tour popover 自動開啟於第一步
- AND localStorage 寫入 `tour:marketplace = 'seen'`

#### Scenario: 再次進入首頁
- GIVEN 使用者 localStorage 已有 `tour:marketplace = 'seen'`
- WHEN 使用者造訪首頁
- THEN tour 不會自動開啟

#### Scenario: 首次進入對話頁
- GIVEN 使用者 localStorage 沒有 `tour:chat` 鍵
- WHEN 使用者造訪對話頁
- THEN 對話 tour 自動開啟於第一步

### Requirement: 手動重開 tour
每個有 tour 的頁面 SHALL 提供顯眼的觸發按鈕，使用者可隨時重新開啟 tour。

#### Scenario: 點擊「？」按鈕
- GIVEN 使用者在首頁，tour 未開啟
- WHEN 使用者點擊右上角「？」按鈕
- THEN tour 從第一步開啟

#### Scenario: 已看過仍可手動觸發
- GIVEN 使用者 localStorage 已有 `tour:marketplace = 'seen'`
- WHEN 使用者點擊「？」按鈕
- THEN tour 仍正常從第一步開啟

### Requirement: Tour 步驟指向實際 UI 元素
每個 step SHALL 使用 CSS selector 指向頁面上存在的元素，popover 顯示於該元素旁。

#### Scenario: 首頁 tour 步驟
- GIVEN 首頁 tour 開啟
- THEN 步驟依序指向：歡迎訊息、搜尋/分類區、工具卡片、建立工具入口
- AND 每一步 popover 緊鄰對應元素

#### Scenario: 對話 tour 步驟
- GIVEN 對話頁 tour 開啟
- THEN 步驟依序指向：歡迎訊息、模型切換、skill 切換、資料來源勾選、輸入框

#### Scenario: 目標元素不存在時略過
- GIVEN tour 的 step selector 在 DOM 上找不到對應元素
- WHEN tour 走到該 step
- THEN 略過該 step，或顯示為 centered popover（依 reactour 預設行為）

### Requirement: Tour 可關閉
使用者 SHALL 能隨時關閉 tour。

#### Scenario: 按 ESC 或 X 關閉
- GIVEN tour 開啟中
- WHEN 使用者按 ESC 或 popover 的 X 按鈕
- THEN tour 關閉，不中斷任何頁面狀態

#### Scenario: 走完最後一步
- GIVEN tour 在最後一步
- WHEN 使用者點「完成」
- THEN tour 關閉

### Requirement: 共用元件可擴充到其他頁面
Tour 基礎設施 SHALL 抽象為可重用元件，新頁面加入 tour 只需提供 pageKey 與 steps 陣列。

#### Scenario: 新頁面加入 tour
- GIVEN 工程師要為技能頁加 tour
- WHEN 新增 `steps/skills.ts` 並在技能頁掛上 TourProvider + TourButton + useAutoTour("skills")
- THEN 技能頁即具備首次自動開、手動重開的完整 tour 功能，無需改動共用元件
