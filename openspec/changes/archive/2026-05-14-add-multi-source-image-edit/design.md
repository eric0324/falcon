# Design: Add Multi-Source Image Edit

## Context

Bridge 與 `generateFromImage` 目前都單張，但 provider 都支援多張。Multi-source 是直接的 API 擴展，沒有 ownership 模型變化（每張 key 個別走既有 ownership check）。

## Decisions

### 決定 1：陣列入參、保留單張

**選項**
A. 新 `sourceImageKeys: string[]`，舊 `sourceImageKey` 仍 work（向後相容）✅
B. 把 `sourceImageKey` 改成可以接 `string | string[]`
C. 完全取代 `sourceImageKey` 為 `sourceImageKeys`

**選 A**。理由：
- 既有 tool code（已部署到 prod）一定有人用單張 — 直接替換會破
- B 在 TypeScript / Zod schema 上容易踩 union type 邊角
- 兩個欄位語意明確：單張用 `sourceImageKey`、多張用 `sourceImageKeys`
- Implementation 內部統一轉成 array：`keys = params.sourceImageKeys ?? (params.sourceImageKey ? [params.sourceImageKey] : [])`

### 決定 2：上限 4 張

**選項**
A. 上限 4 ✅
B. 上限 8
C. 跟 provider 對齊（Gemini ~3、OpenAI 16）

**選 4**。理由：
- 大多數實際用途 ≤ 2-3 張
- 太多張 prompt cost 與 latency 都會跳升
- 兩家 provider 都能至少吃 4 張、無風險
- 之後若有更高需求再放寬

### 決定 3：每張 key 獨立 ownership check

**選項**
A. 對 `sourceImageKeys` 每張獨立 ownership check、任一張失敗即整次 reject ✅
B. 寬鬆：只要至少一張 OK

**選 A**。完全沒商量空間：每張都要過。

### 決定 4：Gemini multi-image 對應 `contents[0].parts` 多個 inlineData

Gemini 2.5 Flash Image API 接受多個 reference image 透過 `contents.parts[].inlineData`：

```json
{
  "contents": [{
    "parts": [
      { "text": "merge these two images" },
      { "inlineData": { "mimeType": "image/png", "data": "<b64>" }},
      { "inlineData": { "mimeType": "image/png", "data": "<b64>" }}
    ]
  }]
}
```

順序：text 在前、images 接續。Prompt 顯式引用順序（"first image" / "second image"）可選。

### 決定 5：OpenAI multi-image — FormData append 多次 `image[]`

OpenAI `/v1/images/edits` 接受多 reference 的形式：

```ts
form.append("image[]", blob1, "1.png");
form.append("image[]", blob2, "2.png");
```

**Implementation 階段需驗證**：實際格式可能是 `image[]` 也可能是多次同名 `image`。實作時用 1 個小 PNG 跑一次 fixture，確認 200。

### 決定 6：Output size 不在本變更額外處理

不同 provider 對「多 reference 時的 output size」行為不同：
- Gemini：靠 prompt 引導
- OpenAI：用 `size` 參數明確指定

維持現狀 — `aspectRatio` 怎麼處理跟單張一樣。文件提醒：multi-image 時 aspectRatio 適用第一張 / output。

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| OpenAI multi-image form 格式不確定 | Implementation 階段先跑 1 個 fixture 驗證；fallback 是 issue tracker 待 OpenAI SDK 文件更新 |
| Gemini multi-image 出來的 quality 落差 | 不是本變更可控 — 取決於 prompt 品質與 model 能力 |
| 多張 image 增加 request body size | 4 張 10MB 上限的圖 base64 後 ~40MB+，落在 Next.js / Vercel body limit 邊緣。實作時設明確 limit、超過直接 reject |

## Open Questions

無。
