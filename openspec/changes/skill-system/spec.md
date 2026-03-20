# Spec: Skill System

## Overview

Skill 是使用者可建立、使用、分享的 prompt template。選取 skill 後，其 prompt 會注入對話中引導 AI 行為，並可自動啟用所需的 data sources。

## Data Model

### Skill

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | 建立者 |
| name | String | Skill 名稱（最多 50 字） |
| description | String | 簡短描述（最多 200 字） |
| prompt | String | Prompt template（最多 2000 字） |
| requiredDataSources | String[] | 需要的 data source IDs（可為空） |
| category | Enum | `analytics` / `marketing` / `project-management` / `writing` / `other` |
| visibility | Enum | `private` / `public` |
| usageCount | Int | 被使用次數（含他人使用） |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## Scenarios

### S1: 建立 Skill

**Given** 已登入的使用者
**When** 在 skill 管理頁面點選「新增 Skill」
**Then** 顯示建立表單，填入 name、description、prompt、category、requiredDataSources、visibility
**And** 送出後建立 skill，預設 visibility = private

**驗證規則：**
- name: 必填，1-50 字
- description: 必填，1-200 字
- prompt: 必填，1-2000 字
- category: 必填
- visibility: 必填，預設 private

### S2: 編輯 / 刪除 Skill

**Given** 使用者已建立的 skill
**When** 點選編輯 → 可修改所有欄位
**When** 點選刪除 → 確認後刪除
**Then** 只有建立者可以編輯/刪除自己的 skill

### S3: 在聊天中選用 Skill

**Given** 使用者在聊天輸入框的工具列
**When** 點選 Skill 選單按鈕
**Then** 顯示 dropdown，包含：
- 「我的 Skills」區塊（使用者自己的 private + public skills）
- 「公開 Skills」區塊（其他人的 public skills）
- 搜尋欄位（依 name / description 搜尋）
- 依 category 分群顯示

**When** 選取一個 skill
**Then**
- Skill 的 prompt 填入輸入框作為使用者訊息
- 如果 skill 有 requiredDataSources，自動勾選對應的 data sources
- usageCount + 1

### S4: 瀏覽公開 Skills

**Given** 任何已登入的使用者
**When** 在 skill 選單中瀏覽
**Then** 可看到所有 public skills，顯示：
- skill name、description、category
- 作者名稱
- 使用次數
- 排序：依使用次數 desc

### S5: Skill 管理頁面

**Given** 已登入的使用者
**When** 從 sidebar 進入 skill 管理頁
**Then** 顯示自己建立的所有 skills（含 private 和 public）
**And** 可新增、編輯、刪除
**And** 可看到每個 skill 的使用次數

## Categories

| ID | 名稱 |
|---|---|
| analytics | 數據分析 |
| marketing | 行銷 |
| project-management | 專案管理 |
| writing | 寫作 |
| other | 其他 |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/skills` | 取得 skills（支援 ?visibility=public&category=xxx&search=xxx） |
| GET | `/api/skills/mine` | 取得自己的 skills |
| POST | `/api/skills` | 建立 skill |
| PUT | `/api/skills/[id]` | 更新 skill（僅建立者） |
| DELETE | `/api/skills/[id]` | 刪除 skill（僅建立者） |
| POST | `/api/skills/[id]/use` | 記錄使用（usageCount + 1） |
