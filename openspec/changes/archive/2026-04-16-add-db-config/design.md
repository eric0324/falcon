# Design: add-db-config

## Data Model

```prisma
model SystemConfig {
  key         String   @id
  value       String   // 加密後的值
  encrypted   Boolean  @default(true)
  description String?
  group       String   // "oauth", "ai", "integration", "analytics", "general"
  updatedAt   DateTime @updatedAt
  updatedBy   String?  // userId
}
```

- `key`: 對應原本的 env var name，如 `ANTHROPIC_API_KEY`
- `value`: 加密儲存（使用現有 AES-256-GCM）
- `group`: 用於後台 UI 分組顯示

## getConfig 工具函式

```typescript
// src/lib/config.ts
async function getConfig(key: string): Promise<string | undefined>
async function getConfigRequired(key: string): Promise<string> // throws if missing
function invalidateConfigCache(): void
```

**讀取順序**: DB → process.env → undefined

**快取策略**: 
- 記憶體快取，TTL 60 秒
- 寫入時立即 invalidate
- 避免每次 request 都查 DB

## Auth 動態化

現有問題：`authOptions` 是 module-level 常數，`GoogleProvider()` 在 import 時就執行。

解法：改為函式，延遲讀取設定。

```typescript
// Before
export const authOptions: NextAuthOptions = {
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID! })]
}

// After  
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const clientId = await getConfigRequired("GOOGLE_CLIENT_ID");
  const clientSecret = await getConfigRequired("GOOGLE_CLIENT_SECRET");
  return {
    providers: [GoogleProvider({ clientId, clientSecret })]
  }
}
```

影響檔案：所有 `import { authOptions }` 的地方改為 `await getAuthOptions()`。

## AI Model 動態化

現有問題：`@ai-sdk` 的 `anthropic()`, `openai()`, `google()` 預設從 process.env 讀 key。

解法：改用 `createAnthropic()` 等 factory，手動傳入 key。

```typescript
// Before
import { anthropic } from "@ai-sdk/anthropic";
const model = anthropic("claude-sonnet-4-6");

// After
import { createAnthropic } from "@ai-sdk/anthropic";

export async function getModel(modelId: ModelId) {
  const providers = {
    anthropic: createAnthropic({ apiKey: await getConfig("ANTHROPIC_API_KEY") }),
    openai: createOpenAI({ apiKey: await getConfig("OPENAI_API_KEY") }),
    google: createGoogleGenerativeAI({ apiKey: await getConfig("GOOGLE_GENERATIVE_AI_API_KEY") }),
  };
  // ...
}
```

## 後台 UI

路徑：`/admin/settings`

分組：
1. **OAuth 設定** — Google Client ID / Secret、允許的 Email Domain
2. **AI 模型** — Anthropic / OpenAI / Google AI API Keys
3. **整合服務** — Notion / Slack / Asana / GitHub / Vimeo
4. **分析平台** — Plausible / GA4 / Meta Ads
5. **一般設定** — 預設配額、搜尋設定

每個欄位：
- Label + description
- Password input（敏感值不顯示明文，只顯示 `••••••` 表示已設定）
- 儲存按鈕
- 狀態指示（已設定 / 未設定）

## 安全考量

- API keys 使用現有 `encrypt()` / `decrypt()` 加密儲存
- 後台頁面僅 ADMIN 角色可存取（沿用現有 admin layout 權限檢查）
- API 回傳設定值時，敏感欄位只回傳是否已設定，不回傳明文
- GET endpoint 回傳 masked 值，PUT endpoint 接受新值
