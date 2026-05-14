# image-generation Spec Delta: add-multi-source-image-edit

擴展 `image.edit`、`generateFromImage`、agent `generateImage` tool 接受多張 reference image。

## MODIFIED Requirements

### Requirement: 圖生圖

系統 SHALL 提供圖生圖 API，輸入一張或多張 reference image + prompt，產出一張新 image。Reference 上限 4 張。

#### Scenario: 單張 reference（向後相容）
- GIVEN 呼叫 `generateFromImage({ prompt, sourceImageKeys: ["images/u/a.png"], provider, userId })`
- WHEN 處理
- THEN 載入該張 image buffer，呼叫對應 provider edit API
- AND 行為跟過去 `sourceImageKey: "images/u/a.png"` 完全一致

#### Scenario: 多張 reference
- GIVEN `sourceImageKeys` 含 2-4 張 key
- WHEN 處理
- THEN 系統依序載入每張 buffer
- AND 對 Gemini：把多張 inlineData 一起放進 `contents[0].parts`、text part 在最前
- AND 對 OpenAI gpt-image-1：用 FormData append 多次 image 欄位
- AND 回傳一張產出的 image，沿用既有 s3Key 與 modelUsed 規則

#### Scenario: 超過 4 張
- GIVEN `sourceImageKeys.length > 4`
- WHEN 驗證 params
- THEN 拋出錯誤「最多 4 張 reference image」
- AND 不呼叫 provider、不寫 TokenUsage

#### Scenario: sourceImageKeys 空陣列
- GIVEN `sourceImageKeys: []`
- WHEN 驗證 params
- THEN 拋出錯誤「至少需要 1 張 sourceImageKey」

#### Scenario: 任一張 key 不通過 ownership 檢查
- GIVEN 三張 key 中有一張不屬於 caller / 不屬於該 tool 的 asset
- WHEN 驗證
- THEN 整次 reject，回 400
- AND 不載入任何 buffer、不呼叫 provider

### Requirement: Vibe Coding Bridge Capability

User-built tools running in the Vibe Coding sandbox SHALL be able to generate or edit images through the api-bridge as a platform capability. The `edit` action SHALL accept either a single `sourceImageKey` (string) or a `sourceImageKeys` (string array) for multi-image edit, with the array capped at 4 entries.

#### Scenario: Tool calls bridge.image.edit with single sourceImageKey

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "edit", { prompt: "make it green", sourceImageKey: "images/<callerUserId>/a.png" })`
- WHEN the bridge dispatches
- THEN the handler normalizes to `sourceImageKeys: ["images/<callerUserId>/a.png"]`
- AND the edit proceeds as before

#### Scenario: Tool calls bridge.image.edit with sourceImageKeys array

- GIVEN a user-built tool calls `window.companyAPI.execute("image", "edit", { prompt: "merge user photo with template", sourceImageKeys: ["images/<callerUserId>/photo.png", "tools/<toolId>/images/template.png"] })`
- WHEN the bridge validates
- THEN every key passes the ownership check (personal-namespace match OR tool-asset match)
- AND `generateFromImage` is called with the array
- AND the response is `{ s3Key, presignedUrl, provider }` for the single output

#### Scenario: sourceImageKeys and sourceImageKey both provided

- GIVEN the tool passes both `sourceImageKey: "k1"` and `sourceImageKeys: ["k2", "k3"]`
- WHEN the bridge normalizes
- THEN `sourceImageKeys` wins
- AND `sourceImageKey` is ignored

#### Scenario: sourceImageKeys empty

- GIVEN the tool passes `sourceImageKeys: []` (and no `sourceImageKey`)
- WHEN the bridge validates
- THEN it returns a 400-style error stating that at least one source image is required

#### Scenario: sourceImageKeys exceeds 4

- GIVEN the tool passes 5 keys in `sourceImageKeys`
- WHEN the bridge validates
- THEN it returns a 400-style error stating the 4-key maximum
- AND no buffers are loaded
- AND no provider call is made

#### Scenario: One key in sourceImageKeys fails ownership

- GIVEN 3 keys: 2 valid for the caller, 1 owned by someone else
- WHEN the bridge validates
- THEN it returns a 400-style error citing the offending key
- AND the call is fully rejected, not partially executed

#### Scenario: Billing still 1 image per edit call

- GIVEN any successful `image.edit` with N source keys (1 ≤ N ≤ 4)
- WHEN the call completes
- THEN exactly one `TokenUsage` row is written with `units = 1` and `kind = "image"`
- AND `costUsd` is determined by `imagePricing[modelUsed] * 1`, regardless of N
