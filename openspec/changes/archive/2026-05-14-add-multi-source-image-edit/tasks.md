# Tasks: add-multi-source-image-edit

## 1. `generateFromImage` 改吃 array

- [x] 1.1 `src/lib/ai/image-generation.ts` 的 `generateFromImage` 參數 `sourceImageKey: string` 改為 `sourceImageKeys: string[]`
- [x] 1.2 內部 ownership check 改成迭代每張：`assertKeyOwnership(key, userId)` for each
- [x] 1.3 載入每張 buffer：`Promise.all(keys.map(k => getObjectBuffer({ key: k })))`
- [x] 1.4 `editWithGemini(prompt, sourceBuffers, aspectRatio)`：`contents[0].parts` 改成 text + 多筆 inlineData
- [x] 1.5 `editWithOpenAI(prompt, sourceBuffers, aspectRatio, quality)`：FormData 多次 append image。先用 1 張 fixture 驗證實際成功的 form key 是 `image` 還是 `image[]`

## 2. Bridge `image.edit` 接受 array

- [x] 2.1 `src/lib/bridge/handlers.ts` 的 `handleImageGenerate` 在 edit 分支：
  - 讀 `sourceImageKey` 與 `sourceImageKeys`、normalize 成 `keys: string[]`
  - 驗證 1 ≤ keys.length ≤ 4
  - 每張過 ownership check（沿用 [[add-tool-image-assets]] 的 check function 若已 land）
  - 呼叫 `generateFromImage({ ..., sourceImageKeys: keys })`

## 3. Agent tool 對齊

- [x] 3.1 `src/lib/ai/image-tools.ts` 的 `generateImage` Zod schema：加 `sourceImageKeys: z.array(z.string()).max(4).optional()`，保留 `sourceImageKey`
- [x] 3.2 Execute 把兩個欄位 normalize 後傳給 `generateFromImage`

## 4. System prompt 更新

- [x] 4.1 `IMAGE_BRIDGE_INSTRUCTIONS` 加 multi-source 範例（人 + 背景、人 + 樣板等常見組合）
- [x] 4.2 強調「4 張上限」、「每張 key 都要屬於 caller 或 tool asset」

## 5. 測試

- [x] 5.1 `handlers.image.test.ts` 補：
  - sourceImageKey 單張 → 內部 normalize 成 array、呼叫 generateFromImage 收 `["k"]`
  - sourceImageKeys 三張、都 OK → 呼叫成功
  - sourceImageKeys 三張、其中一張跨用戶 → 400
  - sourceImageKeys 5 張 → 400
  - sourceImageKeys 空陣列 → 400
  - 同時傳 sourceImageKey + sourceImageKeys → 後者勝出
  - 計費仍 units=1（不因張數倍增）
- [x] 5.2 `generateFromImage` 多張 buffer 走 Gemini 路徑的 fixture test（mock fetch）
- [x] 5.3 OpenAI 路徑 fixture test（mock fetch，驗證 FormData 含多個 image entry）

## 6. 收尾

- [x] 6.1 `bun run lint` + `bun run test` + `bun run build`
- [x] 6.2 `openspec validate add-multi-source-image-edit --strict --no-interactive`
- [ ] 6.3 手動煙霧測：chat 寫一個「合成兩張圖」工具、跑通（**待 deploy 後人工執行**）
- [ ] 6.4 archive（**待 reviewer 確認**）
