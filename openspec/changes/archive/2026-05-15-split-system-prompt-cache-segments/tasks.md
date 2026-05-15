# Tasks: 分層 System Prompt Cache Segmentation

## Task 1: Layered builder 介面
- [x] 1.1 在 `src/lib/ai/system-prompt.ts` 新增型別 `SystemPromptSegments = { core: string; capabilities: string; volatile: string }`
- [x] 1.2 新增 `buildLayeredSystemPrompt(opts): SystemPromptSegments`，opts 含現有 `dataSources` / `availableSources` / `imageGenerationEnabled` 加上新欄位 `volatileExtras?: string`
- [x] 1.3 既有 `buildSystemPrompt(...): string` 改為內部呼叫 `buildLayeredSystemPrompt` 並 concat 三段（向後相容）
- [x] 1.4 撰寫單元測試：相同 `dataSources` 下 `buildLayeredSystemPrompt` 兩次呼叫 `core` 段位元組完全相同（剝離 `volatileExtras`）

## Task 2: 切段內容歸位
- [x] 2.1 `Current Time` 從 BASE 區後移到 Volatile 段最前
- [x] 2.2 Core 段內容：`BASE_PROMPT` + `LLM_BRIDGE_INSTRUCTIONS` + `SCRAPER_BRIDGE_INSTRUCTIONS` + `TOOLDB_INSTRUCTIONS`
- [x] 2.3 Capabilities 段內容：各 dataSource INSTRUCTIONS + `buildGoogleInstructions` + `buildCompanyApiInstructions` + `IMAGE_GENERATION_INSTRUCTIONS` + `IMAGE_BRIDGE_INSTRUCTIONS`（僅 `imageGenerationEnabled` 為真時）+ `buildSuggestDataSourcesInstructions`
- [x] 2.4 Volatile 段內容：Current Time + 呼叫端傳入的 `volatileExtras`
- [x] 2.5 單元測試覆蓋：空 dataSources、單一 dataSource、多 dataSources（含 image）、有/無 availableSources 各情境

## Task 3: cacheableSystem 多段化
- [x] 3.1 在 `src/lib/ai/cache-control.ts` 擴充 `cacheableSystem` 支援第二種輸入 `SystemPromptSegments`
- [x] 3.2 Anthropic 分支回傳 `Array<SystemModelMessage>`，每段一條 message，前兩段帶 `providerOptions.anthropic.cacheControl.type = "ephemeral"`，第三段不帶。（@ai-sdk/anthropic plugin 會把連續 system messages 合併成 API-level `system: [{type:"text", text, cache_control}, ...]`，每段 cache_control 獨立）
- [x] 3.3 OpenAI / Gemini 分支：concat 三段為單字串回傳（順序 core → capabilities → volatile）
- [x] 3.4 既有單字串簽名保留向後相容（測試不能破）
- [x] 3.5 新增測試：三段輸入 → Anthropic 結構正確、provider 分支正確、空段不產生空 message

## Task 4: chat route 切換
- [x] 4.1 `src/app/api/chat/route.ts` 改呼叫 `buildLayeredSystemPrompt(...)`，把 `memoryRecall.promptText / skillPrompt / currentToolCode block / largeToolNotice` concat 成 `volatileExtras` 傳入
- [x] 4.2 主 `streamText` 的 `system: cacheableSystem(systemSegments, modelName)`
- [x] 4.3 compact fallback 路徑同步切換（fallback 罕觸發，但統一介面；附加的「已用完工具呼叫」字串接在 `volatile` 段尾）
- [x] 4.4 在 `[Chat API] system segments` log 加上 `core=N cap=N vol=N total=N` 各段估算
- [x] 4.5 `estimateTokens` 改為各段分別估算後加總（結果與 concat 後估算等價，但同時取得 segmentTokens）

## Task 5: 觀察與驗收
- [x] 5.1 本地連續 5 輪對話（同 dataSources、不同 user 訊息）：第 2 輪起 `cache_read_input_tokens` 涵蓋 core+capabilities 大小
- [x] 5.2 切換 dataSources 後第 2 輪：core 仍命中 cache（cacheReadTokens >= core 段 tokens）
- [x] 5.3 切換到 gpt-5-mini：請求不含 `providerOptions.anthropic`，正常運作
- [x] 5.4 切換到 gemini-flash：同上，正常運作
- [x] 5.5 既有測試套件全綠（`bun run test`）— 901 tests pass, `tsc --noEmit` 無新增錯誤

## Task 6: 收尾
- [x] 6.1 Changelog 條目（v0.33.1「長對話 prompt cache 命中率提升」，showDialog: false 因內部優化使用者體感無變化）
- [x] 6.2 `openspec validate split-system-prompt-cache-segments --strict` 通過
- [x] 6.3 archive `enable-prompt-caching`（archived as `2026-05-15-enable-prompt-caching`；過程修了它原本 spec delta 把 ADDED requirement 誤標為 MODIFIED 的小 bug）
- [x] 6.4 archive `split-system-prompt-cache-segments`（archived as `2026-05-15-split-system-prompt-cache-segments`，+3 ADDED ~1 MODIFIED 寫入 main studio spec）

## 依賴關係

```
Task 1 ──┬── Task 2 ──┬── Task 4 ── Task 5 ── Task 6
         └── Task 3 ──┘
```

- Task 1、2、3 是純函式層，可平行
- Task 4 依賴 1+3 介面
- Task 5 是 e2e 驗收
- Task 6 收尾
