# Proposal: Skill System

## Problem

目前使用者每次都要用自然語言從頭描述需求，AI 的回應品質取決於使用者的 prompt 能力。常見的操作模式（例如「產出流量週報」、「分析 UTM 成效」）每次都要重新描述，無法重複利用好的 prompt。

## Solution

新增 Skill 系統 — 使用者可以建立、使用、分享預定義的 prompt template。

Skill 本質上是一段 **prompt 指令**，觸發時注入對話中引導 AI 行為。Skill 可選綁定所需的 data sources，確保執行時有對應的資料存取權限。

## Core Concepts

### Skill 組成

| 欄位 | 說明 |
|---|---|
| name | Skill 名稱（如「流量週報」） |
| description | 簡短描述，用於搜尋和瀏覽 |
| prompt | 核心 prompt template，注入對話時使用 |
| requiredDataSources | 可選，指定此 skill 需要的 data sources（如 `["plausible"]`） |
| visibility | `private`（僅自己）/ `public`（所有人可見） |
| category | 分類標籤（如 analytics、marketing、project-management） |

### 使用流程

1. 使用者在聊天介面點開 **Skill 選單**
2. 瀏覽/搜尋可用的 skill（自己的 + 公開的）
3. 選擇一個 skill
4. Skill 的 prompt 被注入為使用者訊息，同時自動啟用所需的 data sources
5. AI 照著 skill prompt 執行

### 分享機制

- 使用者建立 skill 時可選擇 `public`
- 公開的 skill 所有人都能在 skill 選單中瀏覽和使用
- 顯示作者、使用次數等資訊供參考

## Scope

### In Scope

- Skill CRUD（建立、編輯、刪除）
- Skill 瀏覽/搜尋 UI（在聊天視窗中）
- Skill 觸發（選取後注入 prompt + 自動啟用 data sources）
- Skill 可見度（private / public）
- Skill 使用次數統計

### Out of Scope（未來再做）

- Skill 評分/評論
- Skill 版本控制
- Skill 參數化（動態帶入變數）
- 團隊/群組層級的可見度
- Skill 匯入/匯出

## Impact

- **DB**: 新增 `Skill` model
- **API**: 新增 `/api/skills` CRUD routes
- **Chat API**: 修改 `/api/chat` 支援 skill prompt 注入
- **Frontend**: 新增 skill 選單 UI、skill 管理頁面
