# Add Image Bridge Capability

## Why

目前圖片生成只在 Vibe Coding 開發階段可用 — AI agent 透過 `createImageTools` 幫使用者作圖。但工具一旦部署、使用者實際操作工具時，工具本身無法呼叫圖片生成。

對比：聲音轉錄 `transcribe` 已經是 bridge 的 platform capability，任何工具都能 `window.companyAPI.execute("transcribe", ...)`。圖片應該享同樣待遇 — 不然「使用者輸入描述 → 工具即時產圖」這類常見場景做不出來。

底層的 `generateFromText / generateFromImage` 函式都已經存在，只差一個 bridge endpoint 把它接出來。

## What Changes

### Bridge endpoint

`dataSourceId: "image"` 加進 `src/app/api/bridge/route.ts` 的 `isPlatformCapability` 白名單，跟 `llm / tooldb / scrape / transcribe` 同級，任何工具呼叫都不必先加 dataSources。

兩個 action：

- `generate` — text-to-image，必要 `prompt`，可選 `provider / aspectRatio / quality`
- `edit` — image-to-image，必要 `prompt + sourceImageKey`

回傳：`{ s3Key, presignedUrl, provider }`，與 agent tool 對齊。

`sourceImageKey` 必須以 `images/<userId>/` 開頭，否則 400 — 防止跨用戶讀圖。

### Bridge handler 與計費

`src/lib/bridge/handlers.ts` 新增 `handleImage()`，內部包 `generateFromText / generateFromImage`，寫入 `TokenUsage`（`kind="image"`、`userId=` 呼叫者、`units=1`、`costUsd=imagePricing[model]`）。失敗則 throw、不計費。

### System prompt 條目

`src/lib/ai/system-prompt.ts` 新增 `IMAGE_BRIDGE_INSTRUCTIONS`，跟 `LLM_BRIDGE_INSTRUCTIONS / SCRAPER_BRIDGE_INSTRUCTIONS` 同樣 `prompt += ...` 注入，讓 AI 寫工具時主動知道可以從 runtime 產圖。

**只在 `imageGenerationEnabled === true` 時注入**（與既有 `IMAGE_GENERATION_INSTRUCTIONS` 同樣的閘門）— 沒選圖片 provider 的對話不應推銷這個能力。

### Quota 阻擋

工具呼叫 `image.generate` 時若呼叫者已超過 quota，bridge 應回 403 並包含 `quota_exceeded`，與既有 chat / 其它扣 quota 入口一致。

## Impact

- **Affected specs**:
  - `image-generation` — ADD `Vibe Coding Bridge Capability` 與 `Bridge Billing` 兩個 requirement，鏡射 audio-transcription spec 的結構

- **Affected code**:
  - `src/lib/bridge/handlers.ts` — 新增 `handleImage`、加進 dispatcher
  - `src/app/api/bridge/route.ts` — 把 `"image"` 加進 `isPlatformCapability`
  - `src/lib/ai/system-prompt.ts` — 新增 `IMAGE_BRIDGE_INSTRUCTIONS` 並注入

- **Breaking changes**: 無
- **Migration**: 不必，純新增 endpoint
- **Risk**: 任何工具都能匿名呼叫產圖 → quota / 防濫用 → 透過既有 quota 機制 + sourceImageKey ownership check 控制
