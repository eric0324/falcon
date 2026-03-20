# Tasks: Skill System

## Task 1: Database Schema

- [x] 在 `prisma/schema.prisma` 新增 `Skill` model
- [x] 在 `User` model 加入 `skills Skill[]` relation
- [x] 執行 `prisma db push` 同步 DB
- [x] 執行 `prisma generate`

## Task 2: API Routes — CRUD

- [x] `POST /api/skills` — 建立 skill（含 zod validation）
- [x] `GET /api/skills/mine` — 取得自己的 skills
- [x] `GET /api/skills` — 取得公開 + 自己的 skills（支援 category、search filter）
- [x] `PUT /api/skills/[id]` — 更新 skill（權限檢查）
- [x] `DELETE /api/skills/[id]` — 刪除 skill（權限檢查）
- [x] `POST /api/skills/[id]/use` — 使用次數 +1

## Task 3: i18n

- [x] 在各語言檔案新增 skills 相關的翻譯 key

## Task 4: Skill 管理頁面

- [x] Sidebar 新增「Skills」導航項目（Wand2 icon）
- [x] 建立 `src/app/(app)/skills/page.tsx` — skill 列表頁
- [x] 建立 skill 新增/編輯 Dialog（name, description, prompt, category, requiredDataSources, visibility）
- [x] 刪除確認 + 刪除功能
- [x] 顯示 usageCount、category badge、visibility badge

## Task 5: SkillSelector 元件

- [x] 建立 `src/components/skill-selector.tsx`
- [x] 實作 dropdown：搜尋欄、「我的 Skills」區塊、「公開 Skills」區塊
- [x] 選取 skill 時回傳 prompt + requiredDataSources

## Task 6: Chat Page 整合

- [x] 在聊天工具列加入 SkillSelector（DataSourceSelector 旁）
- [x] 選取 skill 時：prompt 填入輸入框 + 自動啟用 requiredDataSources
- [x] 選取後呼叫 `POST /api/skills/[id]/use` 記錄使用
