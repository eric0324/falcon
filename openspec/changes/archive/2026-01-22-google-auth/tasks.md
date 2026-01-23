# Tasks: Google OAuth Authentication

## 1. NextAuth.js Setup
- [x] 1.1 Install NextAuth.js
  ```bash
  pnpm add next-auth @auth/prisma-adapter
  ```
- [x] 1.2 Create auth configuration (`src/lib/auth.ts`)
- [x] 1.3 Create API route (`src/app/api/auth/[...nextauth]/route.ts`)
- [x] 1.4 Add SessionProvider to root layout (`src/components/providers.tsx`)

## 2. Google OAuth Provider
- [x] 2.1 Configure Google provider with client ID/secret
- [x] 2.2 Implement signIn callback for domain restriction:
  ```typescript
  callbacks: {
    async signIn({ user }) {
      const domain = user.email?.split('@')[1];
      return domain === process.env.ALLOWED_EMAIL_DOMAIN;
    }
  }
  ```
- [x] 2.3 Add error handling for rejected domains (`invalid_domain` error)

## 3. User Database Integration
- [x] 3.1 Configure Prisma adapter for NextAuth
- [x] 3.2 Extend session callback to include user ID and department:
  ```typescript
  async session({ session, token }) {
    session.user.id = token.id;
    session.user.department = token.department;
    return session;
  }
  ```
- [x] 3.3 Run migration for NextAuth tables (Account, Session, User)

## 4. Login Page
- [x] 4.1 Create login page (`src/app/login/page.tsx`)
- [x] 4.2 Build login UI with company branding (`src/components/login-form.tsx`)
- [x] 4.3 Add "Sign in with Google" button using `signIn('google')`
- [x] 4.4 Handle error states (domain rejected, OAuthAccountNotLinked)
- [x] 4.5 Redirect to callbackUrl after successful login

## 5. Protected Routes
- [x] 5.1 Create auth middleware (`src/middleware.ts`)
- [x] 5.2 Define protected route patterns (/studio, /tool, /marketplace, /api/*)
- [x] 5.3 Redirect unauthenticated users to login with callbackUrl
- [x] 5.4 Create `/api/me` endpoint for fetching current user

## 6. Sign Out
- [x] 6.1 Add sign out button to user navigation (`src/components/user-nav.tsx`)
- [x] 6.2 Implement sign out with `signOut()`
- [x] 6.3 Clear session and redirect

## 7. TypeScript Types
- [x] 7.1 Extend NextAuth types for custom session fields:
  ```typescript
  // src/types/next-auth.d.ts
  declare module "next-auth" {
    interface Session {
      user: {
        id: string;
        department?: string | null;
      } & DefaultSession["user"];
    }
  }
  ```
