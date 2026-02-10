# Design: add-admin-dashboard

## Architecture

### Admin Guard 策略

**API 層：** 建立 `requireAdmin()` helper function 在 `src/lib/auth.ts`，各 admin API route 呼叫此 function 做角色驗證。回傳 403 如果非 ADMIN。

**頁面層：** 在 admin layout (`src/app/(app)/admin/layout.tsx`) 做 server-side session 檢查，非 ADMIN 直接 redirect。

**Middleware 層：** 在現有 `middleware.ts` 加入 `/admin` 和 `/api/admin` 的 auth 保護（確保未登入使用者被導向 login）。不在 middleware 做 role 檢查（middleware 無法高效查 DB）。

### 頁面結構

```
src/app/(app)/admin/
├── layout.tsx              # Admin guard (server-side role check)
└── members/
    ├── page.tsx            # 成員列表
    └── [id]/
        └── page.tsx        # 成員對話串
```

### API 結構

```
src/app/api/admin/
└── members/
    ├── route.ts                              # GET: 成員列表 + token 彙總
    └── [id]/
        └── conversations/
            ├── route.ts                      # GET: 對話列表
            └── [conversationId]/
                └── route.ts                  # GET: 對話訊息
```

### 成員列表 API 查詢策略

使用 Prisma 一次查詢 join + aggregation：

```sql
SELECT u.id, u.name, u.email, u.department, u.role,
       COALESCE(SUM(t."totalTokens"), 0) as "totalTokens",
       MAX(t."createdAt") as "lastActive"
FROM "User" u
LEFT JOIN "TokenUsage" t ON t."userId" = u.id
GROUP BY u.id
ORDER BY "totalTokens" DESC
```

用 Prisma 的 `findMany` + `include` + `_count` 或 raw query 實現。

### 對話訊息顯示

對話串頁面使用 expandable rows：
- 預設只顯示對話標題、訊息數、token 用量
- 點擊展開顯示完整訊息內容
- 使用 Server Component 載入列表，Client Component 處理展開互動

## Trade-offs

1. **Server Component vs Client Component for message list**
   - 選擇：Server Component 載入對話列表，展開時 client-side fetch 訊息
   - 原因：對話可能很多，避免一次載入所有訊息

2. **Prisma aggregate vs raw SQL**
   - 選擇：盡量用 Prisma API，複雜查詢再用 raw SQL
   - 原因：保持 type safety，除非效能需要

3. **Middleware role check vs Layout role check**
   - 選擇：Layout 做 role check
   - 原因：Middleware 跑在 Edge Runtime，查 DB 有限制。Layout 在 Node.js runtime 可直接用 Prisma。
