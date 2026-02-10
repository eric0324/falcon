# Tasks: add-admin-dashboard

## Task 1: Admin guard helper + middleware
- [ ] 在 `src/lib/auth.ts` 新增 `requireAdmin()` helper：取得 session、檢查 role === ADMIN、非 ADMIN 回 403
- [ ] 在 `middleware.ts` 加入 `/admin` 和 `/api/admin` 路由保護（未登入 → redirect login）
- [ ] 寫 unit test 驗證 `requireAdmin()` 行為
- **驗證：** test 綠燈

## Task 2: Admin layout (role guard)
- [ ] 建立 `src/app/(app)/admin/layout.tsx`
- [ ] Server-side 取 session，非 ADMIN redirect 到 `/`
- **驗證：** MEMBER 使用者訪問 /admin/* 被 redirect

## Task 3: Members list API
- [ ] 建立 `src/app/api/admin/members/route.ts`
- [ ] GET: 回傳所有使用者 + aggregated totalTokens + lastActive
- [ ] 使用 `requireAdmin()` 做角色驗證
- [ ] 寫 test 驗證回傳格式和權限檢查
- **驗證：** test 綠燈

## Task 4: Members list page
- [ ] 建立 `src/app/(app)/admin/members/page.tsx`
- [ ] 顯示 table：name, email, department, total tokens, last active
- [ ] 每列可點擊，導向 `/admin/members/[id]`
- **驗證：** 頁面正確渲染成員列表

## Task 5: Member conversations API
- [ ] 建立 `src/app/api/admin/members/[id]/conversations/route.ts`
- [ ] GET: 回傳該使用者的對話列表（排除 deletedAt）+ 每個對話的 token 用量
- [ ] 建立 `src/app/api/admin/members/[id]/conversations/[conversationId]/route.ts`
- [ ] GET: 回傳對話完整訊息
- [ ] 寫 test 驗證權限和回傳格式
- **驗證：** test 綠燈

## Task 6: Member conversations page
- [ ] 建立 `src/app/(app)/admin/members/[id]/page.tsx`
- [ ] 顯示該成員資訊 + 對話列表（title, message count, tokens, updatedAt）
- [ ] 點擊對話可展開/收合，顯示完整訊息
- [ ] client-side fetch 訊息內容（lazy load）
- **驗證：** 頁面正確渲染，展開/收合正常運作

## Dependencies
- Task 1 → Task 2, 3, 5（guard 是所有後續的基礎）
- Task 3 → Task 4（API 先行，頁面依賴 API）
- Task 5 → Task 6
- Task 3 和 Task 5 可並行開發
