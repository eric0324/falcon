# Add Multi-Source Image Edit

## Why

`image.edit` 目前只接受 **一張** `sourceImageKey`。實務上很多場景需要兩張以上：

- 「人 + 背景」合成
- 「人物 + 服裝」換裝
- 「商品 + 場景」product mockup
- 「使用者照片 + 樣板」融合
- 「使用者照片 + 公司 logo / 浮水印」（搭配 [[add-tool-image-assets]]）

兩家底層 provider 都支援 multi-image edit：
- **Gemini 2.5 Flash Image**（`imagen` provider 的 edit 模式）— `contents.parts` 可放多個 `inlineData`
- **gpt-image-1** — `images.edits` API 支援 `image[]`，多達 16 張

只是現在 bridge / `generateFromImage` 沒把這個能力接出來。

## What Changes

### Bridge `image.edit` 接受陣列

新加 `sourceImageKeys: string[]` 參數，舊的 `sourceImageKey` 保留向後相容：

```js
// 舊（仍支援）
companyAPI.execute("image", "edit", {
  prompt: "...",
  sourceImageKey: "images/u/a.png",
});

// 新
companyAPI.execute("image", "edit", {
  prompt: "把使用者照片貼到背景裡",
  sourceImageKeys: [
    "images/<userId>/user-photo.png",
    "tools/<toolId>/images/template.png",
  ],
});
```

規則：
- 接受 1-4 張（超過 4 → 400）
- 同時傳兩個欄位時，`sourceImageKeys` 優先、`sourceImageKey` 忽略
- 每張獨立過 ownership check（沿用既有規則 + [[add-tool-image-assets]] 引入的 tool-asset 規則）
- 全部 key 都過後才呼叫 provider，不做部分 fallback

### `generateFromImage` 改吃 array

`src/lib/ai/image-generation.ts`：

- `generateFromImage` 簽名 `sourceImageKey: string` → `sourceImageKeys: string[]`
- 內部 `editWithGemini` / `editWithOpenAI` 各自接受 `sourceBuffers: Buffer[]`：
  - Gemini：`contents[0].parts` push 多筆 `inlineData`
  - OpenAI：FormData append 多次 `image`（OpenAI `/v1/images/edits` 標準寫法）
- Vercel AI SDK 的呼叫不變（仍以單張作為 base — 多張 reference 走原生 fetch）

### 計費

每次 `image.edit` 仍然 = 1 張產出 image、`units = 1`、計費不變。多張 reference 不額外計費（provider 端也沒額外收費）。

## Impact

- **Affected specs**:
  - `image-generation` — MODIFY 既有 `文生圖` / `圖生圖` 中與 sourceImageKey 相關段；MODIFY bridge requirements 接受 `sourceImageKeys`

- **Affected code**:
  - `src/lib/ai/image-generation.ts` — `generateFromImage` 改 array；`editWithGemini` / `editWithOpenAI` 改吃多 buffer
  - `src/lib/bridge/handlers.ts` — `handleImageGenerate` 的 edit 分支處理 array
  - `src/lib/ai/image-tools.ts` — agent tool `generateImage` 的 `sourceImageKey` 同步擴成 `sourceImageKeys`
  - `src/lib/ai/system-prompt.ts` — `IMAGE_BRIDGE_INSTRUCTIONS` 加 multi-source 範例

- **Breaking changes**: 無對外 API 變動。`sourceImageKey` 仍向後相容
- **Migration**: 不必。舊 tool code 自動沿用舊路徑
- **Risks**:
  - 兩張 reference 的 edit quality 比較吃 prompt — 此乃 provider 自身限制，不影響本變更正確性
  - `gpt-image-1` API 對 multi-image 的 form 格式要驗一下（implementation 階段確認）
  - Output size：multi-image 時各家行為不同。Gemini 看 prompt 與 first image；gpt-image-1 看 `size`。文件清楚說明、不額外處理
- **Dependency**: 與 `add-tool-image-assets` 互不依賴。兩者可並行推。若 tool-assets 先 land，sourceImageKeys 自然支援 `tools/<X>/...`；若 multi-source 先 land，sourceImageKeys 僅支援個人空間 keys
