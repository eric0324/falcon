# Design: 分層 System Prompt Cache Segmentation

## Context

Falcon 的 chat 路徑（`src/app/api/chat/route.ts`）一次請求會走多 step tool loop（`MAX_STEPS = 15`），每 step 都重發完整 `system + messages + tools`。Anthropic prompt cache 命中時 input token 只付 0.1x，因此**讓 system 大部分內容跨 step / 跨輪命中**比任何其他優化都槓桿更高。

`enable-prompt-caching` 已啟用顯式快取，但 `cacheableSystem()` 把整個動態組裝後的字串包成單一 cache 區塊。觀察 `src/lib/ai/system-prompt.ts:1077-1186`：

```ts
let prompt = BASE_PROMPT + `\n\n## Current Time\n現在是 ${dateStr} ...`;  // 每分鐘變
// 依 dataSources 加各種 INSTRUCTIONS
// 加 buildCompanyApiInstructions
// 加 IMAGE_GENERATION / IMAGE_BRIDGE（若啟用）
// 加 LLM_BRIDGE / SCRAPER_BRIDGE / TOOLDB（always-on）
```

`route.ts:502-526` 再把 `memoryRecall.promptText`、`skillPrompt`、`currentToolCode`、`largeToolNotice` 串到尾巴。

結果：BASE_PROMPT 之後立刻插 Current Time → 字串永遠都變 → 整段 cache miss。即便對 Anthropic 顯式標 `ephemeral`，每分鐘都會 write 一次新 cache（1.25x 計費），命中率極低。

## Goals

1. 讓 Anthropic prompt cache 跨輪 / 跨 step 命中 Core + Capabilities（占 system prompt 70%+ 內容）
2. 讓 OpenAI prefix cache（≥1024 tokens 自動命中）與 Gemini implicit cache 也吃到折扣
3. 不改變對使用者可見的 system prompt 「語意」，只改組裝順序與封裝格式

## Non-Goals

- 不做按 conversation 分群的長期快取（5 分鐘 ephemeral 已足）
- 不快取 `messages[]` 內個別 message（單次對話內 ROI 偏低）
- 不為 `editCode` 的 currentCode 上下文做特化快取（內容每次都變）
- 不調整 `MAX_STEPS` 或 compact 觸發閾值（屬另一個 change）

## Provider 快取機制差異

| Provider | 機制 | 對本 change 的意義 |
|---|---|---|
| Anthropic | 顯式 `cache_control: ephemeral` 標記，最多 4 個 breakpoint；breakpoint 之前累積快取 | 多段標 breakpoint 直接控制每段命中與否 |
| OpenAI | 自動 prefix cache，prompt ≥1024 tokens 命中，前綴一字不同即 miss | **重排** Current Time 到 prompt 後段是關鍵 |
| Gemini 2.5 | implicit context cache，預設啟用 | 同 OpenAI，受益於重排 |

因此 segment 內容對「三家通用」，但「如何打 breakpoint」只對 Anthropic 有意義。

## Decisions

### Decision 1: 三段切法 vs 兩段切法

**選用三段**。原因：

- **Core**（BASE + always-on bridges）= ~3000 tokens，幾乎跨所有對話穩定
- **Capabilities**（dataSources + image）= ~500-3000 tokens 視組合而定，**單一使用者**內穩定
- **Volatile**（time / memory / skill / currentCode）= ~500-5000 tokens，每輪可能變

若只用兩段（Stable + Volatile），單一使用者切換不同對話（dataSources 不同）會讓 Stable 整段 miss。三段在 Core 層級保住「跨對話跨使用者」的最大共同前綴。

Anthropic 4 個 breakpoint 預算：Core / Capabilities / tools 用 3 個，剩 1 個未來 budget。

### Decision 2: Volatile 段不打 cache_control

明知會變的內容打 ephemeral 等於每次都付 1.25x write 卻幾乎不會 read 命中，純損失。Volatile 段純字串輸出，不附 `providerOptions`。

### Decision 3: `Current Time` 從 BASE 後移到 Volatile 段最前

目前 `src/lib/ai/system-prompt.ts:1080` 把 Current Time 串在 BASE_PROMPT 後面，是這次三家 cache 都失效的關鍵兇手。移到 Volatile 段才能讓前段 prefix 穩定。

語意上「Current Time」放在 Volatile 段最前面，仍位於 system 內，模型一樣能讀到，行為不變。

### Decision 4: cacheableSystem 改為多載 + provider 分支

擴充簽名：

```ts
type Segments = {
  core: string;
  capabilities: string;
  volatile: string;
};

// 既有：單字串呼叫（保留向後相容）
cacheableSystem(text: string, modelId: ModelId): string | SystemModelMessage;

// 新增：多段呼叫
cacheableSystem(segments: Segments, modelId: ModelId): string | SystemModelMessage;
```

Anthropic 分支：

```ts
{
  role: "system",
  content: [
    { type: "text", text: core,         providerOptions: EPHEMERAL },
    { type: "text", text: capabilities, providerOptions: EPHEMERAL },
    { type: "text", text: volatile },
  ],
}
```

OpenAI / Gemini 分支：concat 成單字串（順序：core → capabilities → volatile）回傳。Vercel AI SDK 對非 Anthropic 仍用 string `system` 欄位。

### Decision 5: `buildSystemPrompt` 舊簽名保留

外部呼叫站（包含可能存在的測試）保留字串輸入輸出語意：

```ts
export function buildSystemPrompt(...): string {
  const segs = buildLayeredSystemPrompt(...);
  return [segs.core, segs.capabilities, segs.volatile].filter(Boolean).join("");
}
```

新增 `buildLayeredSystemPrompt(...): Segments`，`route.ts` 改呼叫新版。

### Decision 6: Volatile 段組裝由 route.ts 還是 system-prompt.ts 負責

目前 `route.ts:502-526` 把 memoryRecall / skillPrompt / currentCode / largeToolNotice 串在外面。

**決定**：route.ts 仍維持「組裝 volatile pieces」職責（這些值都來自 request scope），但改為傳入 `buildLayeredSystemPrompt({ ..., volatileExtras: string })`，由 system-prompt.ts 統一輸出 segments。

理由：保持「system-prompt 知道什麼算 volatile」的單一真實來源，避免未來新增動態片段時又分散在 route.ts。

### Decision 7: Vercel AI SDK v6 對多段 content 的支援

`@ai-sdk/anthropic` v3 的 `SystemModelMessage` 接受 `content: string | Array<TextPart>`，每個 TextPart 可帶 `providerOptions`。實測請求送出後 Anthropic API 會收到 `system: [{type:"text", text, cache_control}, ...]` 多 block 格式，符合官方 docs。

風險：若未來升 SDK 版本對 system content array 行為改變，需要回歸測試。

## Risks & Mitigations

| 風險 | 緩解 |
|---|---|
| Capabilities 段對單一使用者「不太穩定」（資料源頻繁切換） | 文件記錄；後續可加 log 觀察。仍勝過現在的 0 命中 |
| 切段邊界放錯（例如把 `Current Time` 留在 Core） | 單元測試明確驗證每段內容 |
| 非 Anthropic 多段被誤傳成 array | `cacheableSystem` provider 分支用 isAnthropicModel guard，並寫測試 |
| 上限 4 breakpoint 不夠用 | 用 3 個留 budget；若未來新增類別，先合併 Core+Capabilities |
| Anthropic 收到多 block 後行為與單字串不一致 | scenario 測試（cache hit 在第 2 輪 > 0）回歸驗證 |

## Open Questions

無。實作前先讀現有 `cacheableSystem` 測試（`src/lib/ai/cache-control.test.ts`）確認既有單字串呼叫不被破壞。
