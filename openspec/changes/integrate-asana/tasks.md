# integrate-asana: Tasks

## Task 1: Asana Client
- [ ] 建立 `src/lib/integrations/asana/client.ts`
  - `isAsanaConfigured()`
  - `asanaFetch()` 封裝 API 呼叫（含 opt_fields）
  - `getWorkspaceId()` — 自動取得 workspace（支援 `ASANA_WORKSPACE_ID` 覆寫）
  - `listProjects()` — 列出專案（排除已封存）
  - `getProjectTasks(projectId)` — 按 section 分組回傳任務
  - `getTask(taskId)` — 任務詳情 + 子任務
  - `getTaskStories(taskId)` — 留言（過濾系統活動）
  - `searchTasks(query)` — 搜尋任務
- [ ] 建立 `src/lib/integrations/asana/index.ts` re-export
- [ ] 建立 `src/lib/integrations/asana/client.test.ts` 單元測試
- **驗證**: `npm test -- asana/client` 全綠

## Task 2: Asana AI Tool
- [ ] 建立 `src/lib/ai/asana-tools.ts`
  - `createAsanaTools()` 回傳 `{ asanaSearch }` 工具
  - action: list / tasks / read / comments / search
  - 回傳輕量格式
- [ ] 建立 `src/lib/ai/asana-tools.test.ts` 單元測試
- **驗證**: `npm test -- asana-tools` 全綠

## Task 3: Route Integration
- [ ] `src/app/api/chat/route.ts`: import asanaTools，加入 dataSources 過濾邏輯
- [ ] `src/app/api/integrations/status/route.ts`: 回報 `asana: isAsanaConfigured()`
- **驗證**: `/api/integrations/status` 回傳 asana 狀態

## Task 4: System Prompt
- [ ] `src/lib/ai/system-prompt.ts`: 加入 Asana 使用指南區塊
- **驗證**: 選擇 Asana 資料來源時，system prompt 包含指南

## Task 5: UI Integration
- [ ] `src/components/data-source-selector.tsx`: 第三方服務加入 Asana 選項
- [ ] 更新 i18n：加入 asana name/description
- [ ] `.env.example`: 加入 `ASANA_PAT`
- **驗證**: UI 中可以選擇/取消 Asana，狀態正確顯示

## Dependencies
- Task 1 → Task 2（tools 依賴 client）
- Task 2 → Task 3（route 依賴 tools）
- Task 1 → Task 3（status route 依賴 client）
- Task 4、Task 5 可與 Task 2 平行
