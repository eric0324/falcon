# Proposal: Google OAuth Authentication

## Summary
Implement Google OAuth login with company domain restriction using NextAuth.js.

## Why
- 需要限制只有公司員工 (@sat.cool) 能登入系統
- 使用 Google OAuth 簡化登入流程，無需管理密碼
- 支援 JWT Session 策略以實現無狀態認證

## What Changes
- 新增 `src/lib/auth.ts` - NextAuth 核心配置
- 新增 `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API 路由
- 新增 `src/app/login/page.tsx` - 登入頁面
- 新增 `src/components/login-form.tsx` - 登入表單元件
- 新增 `src/middleware.ts` - 路由保護中間件
- 新增 `src/types/next-auth.d.ts` - TypeScript 型別擴展
- 新增 `src/components/providers.tsx` - SessionProvider 包裝
- 新增 `src/components/user-nav.tsx` - 用戶導航元件
- 新增 `src/app/api/me/route.ts` - 取得當前用戶 API
- 更新 `prisma/schema.prisma` - User, Account, Session 模型

## Motivation
Users need to authenticate with their company Google accounts. Only @company.com emails should be allowed to prevent unauthorized access.

## Scope

### In Scope
- NextAuth.js setup with Google provider
- Login page UI
- Domain restriction callback
- Session management
- User creation on first login
- Protected route middleware
- Sign out functionality

### Out of Scope
- Role-based permissions (separate change)
- User profile editing
- Multiple OAuth providers

## Success Criteria
- [x] User can click "Sign in with Google"
- [x] Only @sat.cool emails can login
- [x] Non-company emails see error message
- [x] Session persists across page refresh
- [x] User record created in database on first login
- [x] Protected routes redirect to login

## Dependencies
- `project-setup` change completed
- Google Cloud Console OAuth credentials

## Timeline
3-4 hours
