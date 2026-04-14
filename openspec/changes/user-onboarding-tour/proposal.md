# Proposal: user-onboarding-tour

## Summary

加入互動式使用者引導 tour，以 popover 指向實際 UI 元素，讓新手快速了解五大功能區的用法。本次先實作 **首頁 + 對話** 兩個頁面驗證體驗與抽象，其餘三頁後續再補。

## Motivation

使用者反應「大家都不太會用」：新手不知道按鈕在哪、不知道怎麼選模型／技能／資料來源、不知道知識庫與工具的差別。純文字說明頁看完還是找不到按鈕，需要互動式引導直接指著 UI 元素走一遍。

## Approach

- 使用 `@reactour/tour` 套件（輕量、React 原生、maintained）。
- 每個頁面定義自己的 steps（`selector` + `content`），以共用 `TourProvider` 包在 app layout 或個別 page。
- 右上角（或近似位置）放「？」按鈕隨時可重新觸發當前頁面的 tour。
- 首次造訪自動開啟，看完存 `localStorage['tour:<pageKey>'] = 'seen'` 避免重複彈。
- 本次僅實作 **首頁（marketplace）** 與 **對話（chat）** 兩頁；驗證體驗後再推其他頁。

## 頁面與 Tour 步驟

### 首頁（工具市集）— pageKey: `marketplace`
1. 歡迎訊息：這是工具市集，大家做好的工具都在這
2. 指向搜尋／分類區：可以用關鍵字或分類找工具
3. 指向工具卡片：點進去就能直接用
4. 指向「建立工具」入口：想自己做工具，從這裡開始

### 對話 — pageKey: `chat`
1. 歡迎訊息：這是 AI 對話，可以討論、做工具、寫文件
2. 指向模型切換：不同模型擅長的事情不同
3. 指向 skill 切換：選擇 AI 的工作模式
4. 指向資料來源勾選：讓 AI 存取你的資料
5. 指向輸入框：想做什麼直接用講的

## 共用元件設計

```
src/components/onboarding/
  tour-provider.tsx    # 包裝 reactour 的 TourProvider，統一樣式
  tour-button.tsx      # 右上角「？」按鈕，點擊重開 tour
  use-auto-tour.ts     # hook，首次造訪自動開 tour + 寫 localStorage
  steps/
    marketplace.ts     # 首頁 steps
    chat.ts            # 對話 steps
```

## Impact

| 區域 | 檔案 | 改動 |
|------|------|------|
| 套件 | `package.json` | 新增 `@reactour/tour` 依賴 |
| 共用元件 | `src/components/onboarding/*` | 新增 tour provider、button、steps |
| 首頁 | `src/app/(app)/page.tsx` 或 marketplace page | 掛 TourProvider + TourButton，指定 steps |
| 對話 | `src/app/(app)/chat/page.tsx` | 同上；關鍵 UI 元素補 `data-tour` 屬性 |
| UI 元件 | chat 內相關元件 | 目標元素補 `data-tour="xxx"` 選擇器 |

## 非目標（本次不做）

- 技能、工具、知識庫三頁的 tour（等體驗確認後另開 change）
- 多語系（目前全站中文，tour 文案也直接用中文）
- A/B test、tour 完成率追蹤（先上再說）
- 新功能出現時重新觸發 tour（先靠手動「？」）
